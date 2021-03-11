import 'expect-puppeteer';
import type { JestDevServerOptions } from 'jest-dev-server';
import { setup as setupDevServer } from 'jest-dev-server';
import * as path from 'path';
import { v4 as uuidV4 } from 'uuid';
import runCommandAsync from '../modules/runCommandAsync';
import * as crypto from 'crypto';
import * as fs from 'fs';
import getElevatePrefix from '../modules/getElevatePrefix';
import seedDatabase from '../modules/seedDatabase';
import * as chalk from 'chalk';

type Config = { [key: string]: string | undefined }
const setupPuppeteer =
    import('jest-environment-puppeteer') as unknown as Promise<{ setup: (_: Config) => Promise<void> }>;

export declare let cosmosDBTempPath: string;
export default async(globalConfig: Config) : Promise<void> => {
    const ci = process.env['CI'];
    const serversStarted = {
        started: false
    };
    const servers: JestDevServerOptions[] = [];
    const utcDate = new Date().toUTCString();
    const cosmosDBAuthorizationHeaders = {
        'x-ms-date': utcDate,
        'x-ms-version': '2018-12-31',
        Authorization: encodeURIComponent(
            'type=master&ver=1.0&sig=' +
            crypto
                .createHmac(
                    'sha256',
                    Buffer.from(
                        'C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==',
                        'base64'))
                .update(Buffer.from(
                    `head\n\n\n${utcDate.toLowerCase()}\n\n`))
                .digest('base64'))
    };

    const localAppData = process.env['LOCALAPPDATA'];
    const isCI = typeof ci === 'undefined' ? '' : ci === 'true';
    if (isCI) {
        cosmosDBTempPath = path.join(
            typeof localAppData === 'undefined' ? '' : localAppData,
            `CosmosDB-${uuidV4()}`);

        await new Promise<void>((resolve, reject) => fs.mkdir(
            cosmosDBTempPath,
            err => err ? reject(err) : resolve()));

        const cosmosExists = await runCommandAsync(
            'docker inspect --type=image mcr.microsoft.com/cosmosdb/winsrv2019/azure-cosmos-emulator',
            {
                errorCodeToResponses: {
                    1: false
                }
            });

        if (!cosmosExists) {
            await runCommandAsync(
                'docker pull mcr.microsoft.com/cosmosdb/winsrv2019/azure-cosmos-emulator',
                {
                    verbose: true
                });
        }

        servers.push({
            command: 'powershell docker run --name azure-cosmosdb-emulator --rm --memory 2GB -v ' +
                `${cosmosDBTempPath}:C:\\CosmosDB.Emulator\\bind-mount ` +
                '-p 8081:8081 -p 8900:8900 -p 8901:8901 -p 8902:8902 -p 10250:10250 -p 10251:10251 ' +
                '-p 10252:10252 -p 10253:10253 -p 10254:10254 -p 10255:10255 -p 10256:10256 -p 10350:10350 ' +
                '-i mcr.microsoft.com/cosmosdb/winsrv2019/azure-cosmos-emulator',
            protocol: 'https',
            port: 8081,
            launchTimeout: 60000, // 60 seconds
            waitOnScheme: {
                strictSSL: false,
                headers: cosmosDBAuthorizationHeaders
            },
            serversStarted
        });
    } else {
        servers.push({
            command: 'echo Ensure Azure Cosmos emulator is running.&&' +
                'echo The following command can be used to start the emulator&&' +
                'echo (requires Docker setup to use Windows containers):&&' +
                'echo powershell md -Force $env:LOCALAPPDATA\\CosmosDB-Emulator ^^^| Out-Null ^&^& ' +
                'powershell docker run --name azure-cosmosdb-emulator --rm --memory 2GB -v ' +
                '$env:LOCALAPPDATA\\CosmosDB-Emulator:C:\\CosmosDB.Emulator\\bind-mount -p 8081:8081 -p 8900:8900 ' +
                '-p 8901:8901 -p 8902:8902 -p 10250:10250 -p 10251:10251 -p 10252:10252 -p 10253:10253 ' +
                '-p 10254:10254 -p 10255:10255 -p 10256:10256 -p 10350:10350 -d ' +
                '-it mcr.microsoft.com/cosmosdb/windows/azure-cosmos-emulator&&echo.&&' +
                'echo You can tell when the emulator is ready by watching for a file to appear at path:&&' +
                `echo ${typeof localAppData === 'undefined' ? '' : localAppData}\\CosmosDB-Emulator\\` +
                'importcert.ps1&&echo Run the file as Administrator to import its certificates, and test by ' +
                'using a browser and navigating to:&&echo https://localhost:8081/&&timeout 10', // 10 seconds
            protocol: 'https',
            port: 8081,
            usedPortAction: 'ignore',
            waitOnScheme: {
                strictSSL: false,
                headers: cosmosDBAuthorizationHeaders
            },
            serversStarted
        });
    }

    servers.push(
        {
            command: process.env.DEBUG !== 'true'
                ? 'npm run build:production --prefix ../azure-functions' +
                    ' && npm run start:host --prefix ../azure-functions'
                : 'npm run prestart --prefix ../azure-functions && npm run start:host --prefix ../azure-functions',
            protocol: 'http',
            port: 7071,
            launchTimeout: 30000 + (isCI ? 60000 : 0), // 30 seconds (plus more for GitHub Actions)
            serversStarted
        },
        {
            command: process.env.DEBUG !== 'true'
                ? 'npm run build --prefix ../svelte-app && npm run start --prefix ../svelte-app'
                : 'npm run dev --prefix ../svelte-app',
            protocol: 'http',
            port: 5000,
            launchTimeout: 30000 + (isCI ? 60000 : 0), // 30 seconds (plus more for GitHub Actions)
            serversStarted
        });

    try {
        await setupDevServer(servers);
    } catch (e) {
        const err = <{message: string, stack: string} | null>e;
        console.error(chalk.red(
            `\n${err && err.message || <string><unknown>err}\n` +
            ((err && err.stack) ? `${err.stack}\n` : '')));
        throw new Error('Failed to start dev servers prior to starting tests!');
    }
    serversStarted.started = true;

    if (isCI) {
        await runCommandAsync(
            getElevatePrefix() +
            `powershell -ExecutionPolicy Bypass "${cosmosDBTempPath}\\importcert.ps1"`);
    }

    await seedDatabase();

    return (await setupPuppeteer).setup(globalConfig);
};
