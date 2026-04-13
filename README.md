# ⚡ Portfolio Admin Panel

![Project Banner](https://via.placeholder.com/1200x400?text=Portfolio+Admin+Panel+Banner)

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

</div>

<br />

## 🚀 Overview

**Portfolio Admin Panel** is a modern content management system (CMS) for maintaining your portfolio ecosystem. It gives you one place to manage projects and certifications that power the public portfolio site.

> **"Manage your professional journey with style and efficiency."**

---

## ✨ Key Features

- **🔐 Secure Authentication**: Powered by Supabase Auth for secure login access.
- **📂 Project Management**: CRUD operations for portfolio projects with rich details, images, and links.
- **🏆 Certification Tracking**: Manage your professional certifications, including exams, training, and badge images.
- **🎨 Modern UI/UX**: A beautiful, dark-themed interface built with **Tailwind CSS** and **Shadcn UI**.
- **📱 Fully Responsive**: Optimized for seamless usage across desktop, tablet, and mobile devices.
- **⚡ Real-time Updates**: Instant data reflection using Supabase's real-time capabilities.
- **🖼️ Image Management**: Integrated image upload and management via Supabase Storage.

---

## 🛠️ Tech Stack

This project leverages the latest web technologies to ensure scalability and maintainability:

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Components**: [Shadcn UI](https://ui.shadcn.com/) / [Lucide React](https://lucide.dev/)
- **Rich Content Editor**: [Tiptap](https://tiptap.dev/) for project content editing
- **Backend & Database**: [Supabase](https://supabase.com/)
- **State Management**: React Hooks & Context
- **Form Handling**: Controlled Components
- **Notifications**: [Sonner](https://sonner.emilkowal.ski/)

---

## 🚀 Getting Started

Follow these steps to set up the project locally on your machine.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1.  **Clone the repository**

    ```bash
    git clone https://github.com/somkid-s5/portfolio-admin.git
    cd portfolio-admin
    ```

2.  **Install dependencies**

    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Configure Environment Variables**
    Create a `.env.local` file in the root directory and add your Supabase credentials:

    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Run the development server**

    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 📂 Project Structure

A quick look at the top-level files and directories you'll see in this project.

```
.
├── app/                    # Next.js App Router directories
│   ├── (auth)/             # Authentication route group
│   │   └── login/          # Login page
│   ├── admin/              # Protected admin routes (Projects, Certifications)
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Landing/Home page
├── components/             # Reusable UI components
│   ├── ui/                 # Shadcn UI components (Buttons, Inputs, Cards, etc.)
│   └── ...
├── lib/                    # Utility functions and Supabase client
│   ├── supabaseClient.ts   # Supabase configuration
│   └── utils.ts            # Helper functions
├── public/                 # Static assets (images, fonts)
└── ...
```

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 👤 Author

**Smart Somkid Sodsai**

- Website: [smart-th.com](https://smart-th.com)
- GitHub: [@somkid-s5](https://github.com/somkid-s5)

---

<div align="center">
  <sub>Built with ❤️ by Smart Somkid Sodsai</sub>
</div>
