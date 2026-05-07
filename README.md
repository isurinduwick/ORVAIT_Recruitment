# Generic Recruitment Portal

A comprehensive Next.js-based application for conducting timed, proctored assessments for Senior Backend Engineer candidates. Built with Supabase for backend services, featuring automated scoring, integrity monitoring, and admin management tools.

## Features

### For Candidates
- **Unique Token Access**: Secure assessment links via email
- **Timed Assessment**: 60-minute window with automatic expiration
- **Question Types**: Multiple choice (auto-scored) and written responses
- **Real-time Proctoring**: Activity monitoring with integrity warnings
- **Salary Expectations**: Structured salary input with notes
- **Theme Support**: Light/dark mode toggle

### For Administrators
- **Candidate Management**: Add, view, and delete candidates
- **Bulk Operations**: Manage multiple candidates efficiently
- **CV Upload/Download**: Secure file handling with size/type validation
- **Evaluation System**: Rating scales for attitude and knowledge
- **Automated Scoring**: MCQ auto-scoring with manual overrides
- **Suspicious Activity Review**: Proctoring logs for integrity assessment
- **Reporting**: Detailed candidate reports with recommendations

## Tech Stack

- **Frontend**: Next.js 14+, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Storage, RLS)
- **Authentication**: Custom cookie-based admin auth
- **Deployment**: Vercel-ready configuration

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)
4. Run database migrations in Supabase
5. Start development: `npm run dev`

## Usage

- Admin access: Visit `/admin` and enter password
- Candidate access: Use emailed token links
- Reports: Access via candidate-specific URLs

## Security

- Row Level Security enabled
- Service role for server operations
- Client-side proctoring with event logging
- Private file storage

## License

Proprietary software. All rights reserved.