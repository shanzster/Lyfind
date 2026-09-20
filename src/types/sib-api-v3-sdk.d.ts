declare module 'sib-api-v3-sdk' {
  export class ApiClient {
    static instance: ApiClient;
    authentications: {
      'api-key': {
        apiKey: string;
      };
    };
  }

  export class TransactionalEmailsApi {
    sendTransacEmail(sendSmtpEmail: SendSmtpEmail): Promise<any>;
  }

  export class SendSmtpEmail {
    subject?: string;
    htmlContent?: string;
    sender?: { name: string; email: string };
    to?: Array<{ email: string; name?: string }>;
  }

  export default {
    ApiClient,
    TransactionalEmailsApi,
    SendSmtpEmail,
  };
}
