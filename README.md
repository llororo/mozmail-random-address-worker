# Mozmail Random Address Worker

Worker de Cloudflare que xera enderezos aleatorios baixo un subdominio Premium de Mozilla Relay, como `a1b2c3d4e5f6@example.mozmail.com`.

O Worker non usa a API de Mozilla Relay nin crea máscaras mediante credenciais. Os subdominios Premium reciben automaticamente os enderezos enviados a calquera nome local válido.

## Resposta

Unha solicitude `POST` a `/` devolve:

```json
{
  "address": "a1b2c3d4e5f6@example.mozmail.com"
}
```

## Configuración

Edita `wrangler.jsonc`:

- `ADDRESS_DOMAIN`: subdominio de Mozilla Relay, sen `@`;
- `ALLOWED_ORIGIN`: web autorizada para solicitar enderezos;
- `MASK_LENGTH`: número de caracteres aleatorios, entre 8 e 64;
- `namespace_id`: número enteiro que identifica o limitador dentro da túa conta de Cloudflare;
- `limit` e `period`: máximo de solicitudes admitidas durante cada período.

Podes usar `*` como `ALLOWED_ORIGIN`, aínda que unha orixe concreta ofrece máis control.

## Instalación e despregamento

Requírese Node.js, unha conta de Cloudflare, un subdominio Premium de Mozilla Relay e Wrangler 4.36.0 ou posterior.

```sh
npm install
npm test
npx wrangler login
npm run deploy
```

## Uso desde unha web

```js
const response = await fetch("https://worker.example.workers.dev/", {
  method: "POST"
});

const { address } = await response.json();
```

O limitador emprega o enderezo IP facilitado por Cloudflare. As redes compartidas poden agrupar varias persoas baixo a mesma clave.

## Licenza

[MIT](LICENSE)
