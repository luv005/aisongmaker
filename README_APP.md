# AI Music Generator

A modern web application for generating AI-powered music, inspired by musicful.ai. Turn your text descriptions into professional music tracks with no musical experience required.

## Features

### Core Functionality
- **AI Music Generation**: Create original music from text descriptions using Suno AI
- **Multiple Genres**: Support for Classical, Jazz, Electronic, Pop, Rock, Hip Hop, Country, R&B, Metal, Lo-fi, Ambient, and Dance
- **Advanced AI Models**: Choose from V5, V4.5+, V4.5, V4, and V3.5 models
- **Instrumental & Vocal**: Toggle between instrumental tracks and songs with vocals
- **Custom Lyrics**: Input your own lyrics or let AI generate them
- **Music History**: Track and replay all your generated music

### User Experience
- **Dark Theme**: Beautiful dark interface with vibrant green accents
- **Real-time Updates**: Automatic polling for generation status
- **Audio Playback**: Built-in audio player for instant listening
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Technology Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + tRPC
- **Database**: MySQL/TiDB with Drizzle ORM
- **Authentication**: Google OAuth (optional, with local dev fallback)
- **AI Service**: Suno API (sunoapi.org)

## Getting Started

### Prerequisites
- Node.js 22+
- MySQL/TiDB database
- Suno API key (from https://sunoapi.org/)

### Installation

1. Clone the project
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   - `DATABASE_URL`: MySQL connection string (TiDB or MySQL)
   - `JWT_SECRET`: Secret for signing session cookies
   - `ENABLE_OAUTH`: `true` to require Google login, `false` for local-only mode
   - `VITE_GOOGLE_CLIENT_ID`: Google OAuth client ID
   - `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
   - `OPENAI_API_KEY`: Required for GPT-4o mini lyric generation fallback
   - `OWNER_OPEN_ID` / `OWNER_NAME`: Seeded administrator account (also used when `ENABLE_OAUTH=false`)
   - `MINIMAX_API_KEY`, `REPLICATE_API_TOKEN`, and other AI keys as needed

4. Push database schema:
   ```bash
   pnpm db:push
   ```

5. Start development server:
   ```bash
   pnpm dev
   ```

## Usage

### Generating Music

1. **Sign In**: Click "Sign In" to authenticate
2. **Enter Details**:
   - Song Title (max 80 characters)
   - Genre/Style (select from dropdown)
   - AI Model (V5 recommended for best results)
   - Toggle "Instrumental" if you want music without vocals
   - Enter lyrics or description (up to 5000 characters)

3. **Generate**: Click "Generate Music" button
4. **Wait**: Music generation takes 2-3 minutes
5. **Listen**: Play your generated tracks from the history panel

### Music History

- View all your generated tracks in the right panel
- Tracks update automatically as they're processed
- Play tracks directly in the browser
- Status indicators show: Pending, Processing, Completed, or Failed

## API Integration

The app integrates with Suno API for music generation:

- **Endpoint**: `https://api.sunoapi.org/api/v1/generate`
- **Features Used**:
  - Music generation with custom parameters
  - Task polling for completion status
  - Multiple AI model support
  - Custom mode for precise control

### Demo Mode

If no API key is configured, the app runs in demo mode with sample audio tracks for testing the interface.

## Database Schema

### Users Table
- Standard OAuth user information
- Role-based access control

### Music Tracks Table
- `id`: Unique track identifier
- `userId`: Owner of the track
- `taskId`: Suno API task ID
- `title`: Song title
- `prompt`: User's lyrics or description
- `style`: Genre/style
- `model`: AI model used
- `instrumental`: Yes/No
- `audioUrl`: Final audio file URL
- `streamUrl`: Streaming URL
- `status`: pending/processing/completed/failed
- `createdAt`: Generation timestamp

## Development

### Project Structure
```
client/
  src/
    pages/Home.tsx        # Main music generator interface
    components/           # Reusable UI components
    lib/trpc.ts          # tRPC client setup
server/
  routers.ts            # tRPC API routes
  db.ts                 # Database queries
  sunoApi.ts            # Suno API integration
drizzle/
  schema.ts             # Database schema
```

### Key Files
- `server/sunoApi.ts`: Suno API integration with polling logic
- `server/routers.ts`: Music generation and history endpoints
- `client/src/pages/Home.tsx`: Main UI with form and history

## Deployment

Deploy to your preferred platform (e.g. Vercel, Render). Make sure the production environment includes all secrets listed above, especially `DATABASE_URL`, `JWT_SECRET`, and the Google OAuth credentials. When running in production, set `ENABLE_OAUTH=true` so users must authenticate with Google before accessing the app.

## Credits

- Inspired by [Musicful.ai](https://www.musicful.ai/)
- Powered by [Suno API](https://sunoapi.org/)

## License

This project is for demonstration purposes.
