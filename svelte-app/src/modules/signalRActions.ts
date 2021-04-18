import { globalFeedback } from '../stores/globalFeedback';
import { runUnderOrganizationStore } from '../stores/organization';
import fetchMessages from './fetchMessages';
import type { NewGroupUserMessage } from './serverInterfaces';

export function newGroupUser(message: NewGroupUserMessage) : void {
    runUnderOrganizationStore(store => store.appendGroupUser({
        user: {
            emailAddress: message.emailAddress,
            encryptionPublicKey: message.encryptionKey
        },
        organization: message.organization,
        group: message.group
    })).catch(reason =>
        globalFeedback.update(feedback => [
            ...feedback,
            {
                message: 'Error in onNewGroupUser: ' +
                    (reason && (reason as { message: string }).message || reason as string)
            }
        ]));
}
export function newMessage() : void {
    fetchMessages({}).catch(reason =>
        globalFeedback.update(feedback => [
            ...feedback,
            {
                message: 'Error in onNewMessage: ' +
                    (reason && (reason as { message: string }).message || reason as string)
            }
        ]));
}
