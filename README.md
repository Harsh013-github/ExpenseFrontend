# Expense Whisperer - Finance Tracker

A modern expense tracking application built with React, TypeScript, and Tailwind CSS.

## Project Setup

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Navigate to the project directory.
cd expense-whisperer-587-main

# Step 2: Install the necessary dependencies.
npm install

# Step 3: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## Technologies Used

This project is built with:

- **Vite** - Fast build tool and dev server
- **TypeScript** - Type-safe JavaScript
- **React** - UI library
- **shadcn-ui** - Beautiful component library
- **Tailwind CSS** - Utility-first CSS framework
- **FastAPI** - Backend API (Python)
- **AWS** - Cloud infrastructure (DynamoDB, S3, Cognito)

## Available Scripts

```sh
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## Features

- User authentication with JWT tokens
- Create, read, update, and delete expenses
- Upload and manage receipts/attachments
- Analytics dashboard with charts
- Category-based expense tracking
- Real-time data updates
- Responsive design for all devices

## Backend Integration

The frontend is connected to a deployed FastAPI backend on AWS Elastic Beanstalk.

**API Endpoint**: `http://financetrackerenv-new.eba-7d5mmuzg.us-east-1.elasticbeanstalk.com/api`

## Deployment

To deploy the production build:

```sh
npm run build
# Then deploy the 'dist' folder to your hosting service
```

Supported platforms: Vercel, Netlify, AWS S3, GitHub Pages, and more.

