# Guide d'installation et dépendances

## 1. Outils système obligatoires

| Outil | Usage | Installation | Vérification |
|-------|-------|--------------|--------------|
| **Node.js LTS (18.x ou 20.x)** | Runtime JavaScript pour Truffle, scripts et front-end | https://nodejs.org/ | `node --version`  /  `npm --version` |
| **Git** | Gestion de version, clone du dépôt | https://git-scm.com/downloads | `git --version` |
| **Visual Studio Code** | Éditeur recommandé (extensions : Solidity, ESLint, Prettier, Tailwind CSS IntelliSense, Mermaid) | https://code.visualstudio.com/ | — |

## 2. Stack blockchain (obligatoire)

| Outil | Rôle | Installation |
|-------|------|--------------|
| **Truffle** | Compilation, déploiement et tests des smart contracts Solidity | `npm install -g truffle`
| **Ganache** | Blockchain Ethereum locale pour le développement | https://trufflesuite.com/ganache/
| **MetaMask** | Portefeuille et signature de transactions dans le navigateur | Extension Chrome/Brave/Firefox
| **ethers.js** | Bibliothèque pour interagir avec la blockchain depuis le front/back | `npm install ethers`

> **Solidity** est fourni via Truffle (compilateur `solc`).

## 3. Front-end (React + TypeScript + TanStack)

Initialisation :
```bash
npx create-react-app frontend --template typescript
```

Dépendances principales :
```bash
cd frontend
npm install @tanstack/react-query @tanstack/react-router @tanstack/react-table
npm install ethers axios lucide-react class-variance-authority
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npx shadcn-ui@latest init
```

## 4. Backend optionnel (Node.js / Express / MongoDB)

```bash
mkdir backend && cd backend
npm init -y
npm install express cors dotenv mongoose ethers
npm install --save-dev typescript ts-node @types/node @types/express @types/cors
npx tsc --init
```

- **MongoDB** :
  - Local : https://www.mongodb.com/try/download/community
  - Cloud (Atlas) : https://www.mongodb.com/cloud/atlas

- **Postman** (tests API) : https://www.postman.com/downloads/  *(optionnel)*


## 5. Vérifications rapides

Commande | Résultat attendu
---------|------------------
`truffle version` | Versions de Truffle, Solidity, Node
`ganache --version` *(si CLI)* | Version Ganache
`tsc --version` | Version TypeScript
`mongod --version` | Version MongoDB (installation locale)

## 7. Configuration initiale du projet

1. **Cloner le dépôt** :
   ```bash
   git clone https://github.com/adambouzid/decentralized-sales-platform-web3.git
   cd decentralized-sales-platform-web3
   ```
2. **Lancer Ganache** (GUI ou CLI) et noter l'URL RPC (par défaut `http://127.0.0.1:7545`).
3. **Configurer MetaMask** : ajouter un réseau personnalisé (RPC Ganache) et importer un compte via une clé privée fournie par Ganache.
4. **Initialiser les smart contracts** :
   ```bash
   cd smart-contracts
   truffle init
   ```
5. **Installer les dépendances front-end** (cf. section 3) puis lancer le serveur de dev :
   ```bash
   cd frontend
   npm install
   npm run dev   # ou npm start selon la configuration
   ```
6. **(Optionnel) Installer les dépendances backend** puis démarrer le serveur :
   ```bash
   cd backend
   npm install
   npm run dev
   ```

## 8. Bonnes pratiques

- Tenir à jour ce guide à chaque ajout de dépendance majeure.
- Documenter les versions dans `package.json` et `truffle-config.js`.
- Utiliser un fichier `.env.example` pour lister les variables d'environnement nécessaires (API, MongoDB URI…).
