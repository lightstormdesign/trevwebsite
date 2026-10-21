# LightStorm build rules (all clients)

## Transition videos: the artist is never in them

- The artist disappears the moment the transition video starts. Their real photo
  (the portal portrait) dissolves out in code; the video then plays on the empty plate.
- Never put an AI-generated version of the artist in a transition video: no AI face,
  body, motion, or likeness of them in any frame.
- So the video's start frame is always the portal plate **without the artist**, and every
  transition prompt describes the environment only (light, sky, water, land, camera).
- The video continues the portal shot itself (same place, same light, same camera),
  not a jump to a new environment.
- Exception (TREV, by his decision): his real photo may be the video's first frame if the
  camera whips away instantly (he is out of frame within ~0.5-0.7 s, under motion blur).
  The site covers those first frames with his real photo in code, so an AI version of him
  is never visible.

## Transition videos: two clips, no more

- A transition is made of exactly two AI clips, never more. Don't propose splitting a clip
  into extra clips to work around a problem; solve it inside the two clips (prompting,
  frames, or trimming/covering frames in code).
- TREV's transition: clip 1 = graded Sedona photo -> eagle close-up; clip 2 = eagle close-up
  -> the world's landing frame.
