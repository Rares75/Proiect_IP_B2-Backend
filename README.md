# ProiectIP

To install dependencies:

```sh
bun install
```

To run:

```sh
bun dev
```

open http://localhost:3000

---

## 🛠️ Technology Stack & Documentation

Welcome to the team! Since we have a mix of experience levels, this section is designed to help you get familiar with the tools and libraries we are using in this project. Each technology is listed below with a link to its official documentation and the reason we chose it.

### Core Runtime & Framework

- **[Bun](https://bun.sh/docs)**
  - **Why:** Bun is a blazing-fast, all-in-one JavaScript runtime, package manager, and test runner. We use it instead of Node.js and npm/yarn because it significantly speeds up development, package installation, and script execution.
- **[Hono](https://hono.dev/)**
  - **Why:** Hono is a fast, lightweight, and simple web framework. We use it to build our backend API endpoints. It is highly optimized, type-safe, and works flawlessly with Bun.

### Validation & Authentication

- **[Zod](https://zod.dev/)**
  - **Why:** Zod is a TypeScript-first schema declaration and validation library. We use it to strictly validate incoming API data (like request bodies and query parameters), ensuring we never process unexpected or malicious data.
- **[Better Auth](https://www.better-auth.com/)**
  - **Why:** A comprehensive and secure authentication framework for TypeScript. Building secure auth from scratch is risky; Better Auth handles user sessions, logins, and security best practices out of the box(basically close to none work for us since it handles it by itself).

### File Storage & Emails

- **[AWS SDK for S3 (`@aws-sdk/client-s3`)](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/)**
  - **Why:** The official AWS SDK for Amazon S3. We use this to securely upload, retrieve, and manage static files (like user profile pictures or documents) in cloud storage.
- **[Nodemailer](https://nodemailer.com/)** & **[Resend](https://resend.com/docs/introduction)**
  - **Why:** These are our tools for sending transactional emails (e.g., password resets, welcome emails). Nodemailer handles traditional SMTP connections, while Resend provides a modern, developer-friendly email API.
- **[React & React DOM](https://react.dev/)**
  - **Why:** Although this is a backend service, we include React to build and server-side render our HTML email templates using JSX. It makes creating complex email layouts much easier and more maintainable than writing raw HTML strings.

### Code Quality & Terminal Utilities

- **[Biome (`@biomejs/biome`)](https://biomejs.dev/)**
  - **Why:** Biome is an extremely fast code formatter and linter that replaces both Prettier and ESLint. It ensures everyone on the team writes code with a consistent style and catches potential bugs early. (_Commands: `bun run fmt`, `bun run lint`_)
- **[Picocolors](https://github.com/alexeyraspopov/picocolors), [Figures](https://github.com/sindresorhus/figures), & [Pretty-Error](https://github.com/AriaMinaei/pretty-error)**
  - **Why:** These utility libraries are used to format our console logs and make errors look nice in the terminal. They provide colors, icons, and structured error traces, making local debugging a much smoother experience.
