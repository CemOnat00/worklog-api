/**
 * Express'in Request tipini genişletir.
 *
 * auth middleware'i token'ı doğruladıktan sonra req.user'ı doldurur.
 * Bu bildirim olmadan TypeScript "Request üzerinde user yok" der.
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

export {};
