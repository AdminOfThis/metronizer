
# [Metronizer](https://adminofthis.github.io/metronizer/)
[![Deployment](https://github.com/AdminOfThis/metronizer/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/AdminOfThis/metronizer/actions/workflows/deploy.yml)
A Metronome tool for supporting orchestral live performances.

## Usecase

This tool supports performing and recording live orchestral music pieces. It's not meant to replace a conductor, but to help maintain timing in complex compositions with changing tempi and signatures. Additionally, it enhances performances by adding contextual comments at specific moments.

## Usage

### User Interface
The interface consists of three main parts:
1. **Preview window** - Shows the finished piece with visual metronome
2. **Sections and Comments** - Configure measurements and timing
3. **Settings panel** - Customize appearance and manage projects

### Creating a New Piece

1. **Add sections** for your music piece. Enter the number of bars, BPM, and time signature for each section. For complex pieces, add multiple sections and rearrange them with drag-and-drop.

2. **Add comments** to highlight important elements. Position comments by specifying the bar and beat count. Comment order in the list doesn't affect display order.

3. **Customize appearance** to fit your preferences. Adjust colors, sizes, and display elements.

4. **Test your project** using the time slider, play/pause controls, or arrow keys to verify accuracy.

5. **Save your piece** for future use or easy recreation.

6. **Export as video** (.webm format) to ensure smooth 60FPS playback during performance.

### Keyboard Controls

- `Space` - Play/pause
- `←` `→` - Navigate by bars
- `↑` `↓` - Navigate by sections

## Technical Background:
- The project is written using [p5.js](https://p5js.org)
- The automatic CI/CD is done using GitHub pages.

## License
MIT License - see [LICENSE](https://github.com/AdminOfThis/metronizer/blob/main/LICENSE) file for details.
