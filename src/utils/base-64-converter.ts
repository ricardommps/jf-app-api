import { LoginPayload } from '../dtos/loginPayload.dto';

export const authorizantionTologinPayload = (
  authorization: string,
): LoginPayload | undefined => {
  try {
    if (!authorization) {
      return undefined;
    }

    const authorizationSplited = authorization.split('.');
    if (authorizationSplited.length < 3 || !authorizationSplited[1]) {
      return undefined;
    }

    return JSON.parse(
      Buffer.from(authorizationSplited[1], 'base64').toString('ascii'),
    );
  } catch (error) {
    console.error(error);
    return undefined;
  }
};
