import type { AzureFunction, Context, HttpRequest } from '@azure/functions';

const httpTrigger: AzureFunction = async function(context: Context, req: HttpRequest): Promise<void> {
    context.res = {
        body: JSON.stringify({
            query: req.query,
            body: req.body as unknown
        }),
        headers: {
            'Content-Type': 'application/json'
        }
    };
    return Promise.resolve();
};

export default httpTrigger;
