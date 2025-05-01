const ANIMATION_SPEED = 3;
// 1) Declare animation in the outer scope so your click handler can see it
let aniPlayPause, aniReset;

// 2) Fetch and load Lottie (no color modification)
fetch("./animation/system-solid-26-play-morph-play-pause.json")
  .then((res) => res.json())
  .then((data) => {
    // loadAnimation returns your Lottie instance
    aniPlayPause = lottie.loadAnimation({
      container: document.getElementById("iconPlayPause"),
      renderer: "svg",
      loop: false,
      autoplay: false,
      animationData: data,
      rendererSettings: {
        viewBoxOnly: true,
        hideOnTransparent: false,
        clearCanvas: false,
        progressiveLoad: true,
      },
    });
  })
  .catch((err) => console.error("Failed to load Lottie JSON:", err));

fetch("./animation/system-solid-18-autorenew-hover-autorenew.json")
  .then((res) => res.json())
  .then((data) => {
    // loadAnimation returns your Lottie instance
    aniReset = lottie.loadAnimation({
      container: document.getElementById("iconReset"),
      renderer: "svg",
      loop: true,
      autoplay: false,
      animationData: data,
      rendererSettings: {
        viewBoxOnly: true,
        hideOnTransparent: false,
        clearCanvas: false,
        progressiveLoad: true,
      },
    });
  })
  .catch((err) => console.error("Failed to load Lottie JSON:", err));

document.getElementById("btnParse").addEventListener("mouseenter", () => {
  // Play the animation when the button is hovered over
  aniReset.play();
});

document.getElementById("btnParse").addEventListener("mouseleave", () => {
  // Stop the animation when the hover ends
  aniReset.stop();
});

// 2) Listen for the sketch’s toggle event
document.addEventListener("btnPlayPause", (e) => {
  if (!aniPlayPause) return; // not ready yet
  aniPlayPause.setSpeed(ANIMATION_SPEED);
  const shouldPlay = e.detail.isPlaying;
  if (shouldPlay) {
    aniPlayPause.setDirection(1);
    aniPlayPause.play();
  } else {
    aniPlayPause.setDirection(-1);
    aniPlayPause.play();
  }
});
