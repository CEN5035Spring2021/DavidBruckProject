import OpenCrypto from 'opencrypto';
import { signingPrivateKey } from '../stores/user';
import { get } from 'svelte/store';

const SALT_LENGTH = 256;
export interface Signed {
    signature: string;
}
export async function sign<T>(
    { body, crypt, signingKey } : {
        body: T;
        crypt?: OpenCrypto;
        signingKey?: CryptoKey;
    }) : Promise<T & Signed> {
    delete (body as T & { signature: string })['signature'];

    return {
        ...body,
        signature: await (crypt || new OpenCrypto()).sign(
            signingKey || get(signingPrivateKey),
            new TextEncoder().encode(JSON.stringify(body, Object.keys(body).sort())),
            {
                saltLength: SALT_LENGTH
            }) as string
    };
}
