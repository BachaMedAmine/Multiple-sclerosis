import * as crypto from 'crypto';

export function encodeUserIdToInt(userId: string): number {
const hash = crypto.createHash('md5').update(userId).digest('hex');
return parseInt(hash.slice(0, 8), 16);
}
