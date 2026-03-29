export const env = {
  port: Number(process.env.PORT ?? 4010),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:4000"
};
