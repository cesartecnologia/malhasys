# MalhariaOS

Sistema web de gestão operacional para malharias, criado com React, TypeScript, Vite, CSS customizado, Lucide React, Firebase Firestore e upload de arquivos pelo Cloudinary.

## Rodar localmente

```bash
npm install
npm run dev
```

## Firebase

Crie um arquivo `.env` na raiz com:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=
```

Coleções usadas:

- `clientes`
- `pedidos`
- `metas`
- `empresa/config`
- `usuarios`

As regras em `firestore.rules` exigem Firebase Authentication por email/senha e perfil cadastrado em `usuarios/{uid}`.

Habilite o provedor **Email/senha** em Firebase Authentication. Para cada usuário:

1. Crie o usuário em Firebase Authentication.
2. Copie o UID gerado.
3. Crie o documento `usuarios/{uid}` no Firestore com `nome`, `email`, `perfil` e `ativo: true`.

Para o primeiro administrador, crie esse documento manualmente pelo Console do Firebase antes de usar a tela de usuários do sistema. Depois disso, os novos usuários podem ser cadastrados pela área **Usuários** do app informando o UID criado no Firebase Authentication.

Não use o provedor Anonymous em produção.

Publique as regras com:

```bash
firebase deploy --only firestore:rules
```

## Cloudinary

Os uploads de logo da empresa, foto de cliente e logo/anexo de pedido usam o endpoint unsigned upload do Cloudinary. O app valida tamanho e tipo de arquivo antes do envio, mas o preset no Cloudinary também deve restringir formatos e tamanho. Crie um upload preset unsigned com pasta e formatos permitidos no painel do Cloudinary e informe:

- `VITE_CLOUDINARY_CLOUD_NAME`
- `VITE_CLOUDINARY_UPLOAD_PRESET`

## Deploy Vercel

O projeto é uma SPA Vite. O arquivo `vercel.json` define:

- Framework: `vite`
- Build command: `npm run build`
- Output directory: `dist`
- Rewrite de todas as rotas para `index.html`

No painel da Vercel, configure as mesmas variáveis do `.env` em **Settings > Environment Variables**. Como são variáveis usadas pelo frontend, todas precisam começar com `VITE_`.

Depois do primeiro deploy, adicione o domínio da Vercel em **Firebase Authentication > Settings > Authorized domains** para o login por email/senha funcionar em produção.

As regras do Firestore não são publicadas pela Vercel. Publique com `firebase deploy --only firestore:rules` sempre que alterar `firestore.rules`.
