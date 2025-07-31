# SplitSmart - Expense Splitting App

A modern expense splitting application built with Next.js, Supabase, and Tailwind CSS.

## Features

- 🔐 **Authentication**: Secure sign-up and sign-in with Supabase Auth
- 👥 **Group Management**: Create and manage expense groups
- 💰 **Expense Tracking**: Add, edit, and delete expenses with rupee currency (₹)
- 📊 **Smart Splitting**: Equal or custom split options
- 💬 **Comments**: Discuss expenses with group members
- 📱 **Responsive Design**: Works perfectly on all devices
- ⚡ **Real-time Updates**: Live balance calculations and updates

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Auth)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Supabase account

### Installation

1. Clone the repository:
\`\`\`bash
git clone <your-repo-url>
cd expense-splitter
\`\`\`

2. Install dependencies:
\`\`\`bash
pnpm install
\`\`\`

3. Set up environment variables:
Create a `.env.local` file in the root directory:
\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
\`\`\`

4. Set up the database:
Run the SQL script in `scripts/001-create-tables.sql` in your Supabase SQL editor.

5. Start the development server:
\`\`\`bash
pnpm dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Database Schema

The app uses the following main tables:
- `users` - User profiles
- `groups` - Expense groups
- `group_members` - Group membership
- `expenses` - Individual expenses
- `expense_splits` - How expenses are split
- `comments` - Comments on expenses

## Deployment

The app is ready to deploy on Vercel:

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your environment variables in Vercel dashboard
4. Deploy!

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details.
