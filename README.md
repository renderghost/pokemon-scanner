# Pokemon Scanner

## 1. User Experience (UX)
- Full-screen camera view that fills the entire app window
- Status overlay in the top-left corner showing current state:
  - "No Card Detected"
  - "Card Detected"
  - "Identifying Pokemon..."
  - "Identified as {PokemonName}"
  - "Could not identify Pokemon"
- Real-time bounding box drawn around detected cards
- Start/Stop scanning controls at the bottom of the screen
- Debug information overlay in development mode

## 2. Features
- Real-time camera access and video streaming
- Computer vision-based card detection
- Optical Character Recognition (OCR) for text extraction
- Pokemon name identification using PokeAPI
- Responsive design that works on both desktop and mobile
- Debug mode for development
- Error handling and user feedback
- Performance optimizations (throttling, worker management)
- Memory management for long-running operations

## 3. Requirements
- Modern web browser (Chrome recommended)
- Device with camera access
- Internet connection for API access
- Proper HTTPS setup for camera permissions
- Sufficient lighting for card detection
- Physical Pokemon cards for scanning

## 4. Technologies Used
- Next.js for application framework
- React for UI components
- TensorFlow.js for card detection
- Tesseract.js for OCR
- PokeAPI for Pokemon data
- Web APIs:
  - MediaDevices API for camera access
  - Canvas API for image processing
  - RequestAnimationFrame for smooth rendering

## 5. Special Notes
- Always use @latest tag when installing npm packages
- Never specify exact versions in package.json
- Handle Tesseract.js worker lifecycle properly
- Clean up TensorFlow resources to prevent memory leaks
- Throttle intensive operations (detection, OCR, API calls)
- Support graceful degradation when features aren't available
- Debug mode toggles extra logging and visualization
- Error boundaries catch and handle component failures
- TypeScript types ensure type safety throughout the app
- JSDoc comments document component purposes and usage

# Pokémon Scanner

A real-time web application that uses your device's camera and computer vision to identify Pokémon cards. Simply show a Pokémon card to your camera, and the app will detect the card, read the text, and identify the Pokémon.

![Pokémon Scanner Demo](https://via.placeholder.com/800x400?text=Pokemon+Scanner+Demo)

## Features

- **Real-time Card Detection**: Uses TensorFlow.js to detect when a card is present in the camera view
- **Bounding Box Visualization**: Draws a highlight box around detected cards
- **Optical Character Recognition (OCR)**: Uses Tesseract.js to extract text from cards
- **Pokémon Identification**: Matches extracted text against the PokéAPI database
- **Responsive Design**: Works on desktop and mobile browsers
- **Status Feedback**: Provides real-time status updates during the scanning process
- **Type-Safe Implementation**: Built with TypeScript for robust error prevention

## Requirements

- Modern web browser (Chrome recommended)
- Device with camera
- Stable internet connection
- Pokémon cards to scan

## Installation

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher

### Setup

1. Clone the repository:

```bash
git clone https://github.com/yourusername/pokemon-scanner.git
cd pokemon-scanner
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file in the root directory (optional):

```
# Environment variables (if needed)
NEXT_PUBLIC_DEBUG=false
```

## Usage

### Development Mode

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

Build the application for production:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

### Using the App

1. Grant camera permissions when prompted
2. Hold a Pokémon card in front of your camera
3. Ensure good lighting and minimal background clutter
4. Hold the card steady until it's detected (outlined with a gold box)
5. Wait for the app to process the text and identify the Pokémon
6. View the result in the status box in the top-left corner

## Technical Architecture

### Core Technologies

- **Next.js**: React framework for server-rendered applications
- **TypeScript**: Type-safe JavaScript superset
- **Tailwind CSS**: Utility-first CSS framework with custom "bones" design system
- **TensorFlow.js**: Machine learning library for card detection
- **Tesseract.js**: OCR engine for text extraction
- **PokéAPI**: RESTful API for Pokémon data

### Component Structure

- **CameraFeed**: Manages camera access and video display
- **BoundingBoxCanvas**: Renders detection boxes over video
- **StatusOverlay**: Displays current state and results
- **useScanner**: Custom hook that orchestrates detection, OCR, and identification

### Processing Pipeline

1. **Card Detection**: Uses TensorFlow COCO-SSD model to identify card-like objects
2. **Text Extraction**: Crops the detected card region and performs OCR
3. **Pokémon Identification**: Uses fuzzy matching to compare extracted text against Pokémon names
4. **Result Display**: Updates UI with identification results

## Deployment

### Deploying to Vercel

The easiest way to deploy the application is with Vercel:

1. Push your code to a GitHub repository
2. Import the project in the Vercel dashboard
3. Configure environment variables if needed
4. Deploy

### Manual Deployment

For other hosting platforms:

1. Build the application:

```bash
npm run build
```

2. Deploy the `.next` folder and supporting files according to your hosting provider's instructions.

3. Ensure your hosting environment supports:
   - Node.js runtime (if using SSR features)
   - HTTPS (required for camera access)

## Troubleshooting

### Camera Issues

- **Camera Not Working**: Ensure your browser has permission to access the camera
- **Permission Denied**: Check browser settings and grant camera access
- **Black Screen**: Refresh the page or try a different browser

### Detection Issues

- **Card Not Detected**: Ensure good lighting and hold the card steady
- **False Detections**: Remove other card-like objects from the camera view
- **Slow Performance**: Close other browser tabs and applications

### Identification Issues

- **Wrong Pokémon Identified**: Hold the card closer and ensure the name is clearly visible
- **No Pokémon Identified**: Make sure the card is a genuine Pokémon card with visible text
- **API Errors**: Check your internet connection

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Credits and Acknowledgments

- [PokéAPI](https://pokeapi.co/) for Pokémon data
- [TensorFlow.js](https://www.tensorflow.org/js) for object detection
- [Tesseract.js](https://tesseract.projectnaptha.com/) for OCR
- [Next.js](https://nextjs.org/) for the React framework
- [Tailwind CSS](https://tailwindcss.com/) for styling
- Pokémon is a trademark of Nintendo, Creatures Inc., and GAME FREAK inc.

## License

MIT License - See [LICENSE](LICENSE) for details.
