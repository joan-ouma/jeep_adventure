# Off-Road Jeep Adventure

A 3D WebGL project for my Computer Graphics class. This is an interactive 3D scene where you can drive a jeep across a hilly terrain with realistic lighting, particle effects, and a parent-child hierarchy system.

## Features

### Required Features (Project Requirements)

1. **Parent-Child Hierarchy**
   - The jeep body is the parent object
   - Four wheels are child objects that inherit the jeep's position and rotation
   - When the jeep turns, the wheels turn with it
   - When the jeep moves, the wheels rotate around their axes
   - Front wheels also pivot when turning left/right

2. **Dynamic Lights (Phong Lighting)**
   - Two headlights on the front of the jeep that follow its direction
   - Turn signals that blink orange when turning
   - Phong lighting model with ambient, diffuse, and specular components
   - Headlights are bright enough to light up the road in the dark

3. **Multiple Textures**
   - Grass texture for the terrain on both sides of the road
   - Dusty/dirt texture for the road path
   - Metal texture for the jeep body and wheels
   - Different textures help distinguish the road from the grass areas

4. **Moving Camera (Keyboard Controlled)**
   - Chase camera that follows behind the jeep
   - Camera smoothly adjusts height with terrain
   - You can see the jeep ascending and descending hills
   - Controls: W (forward), S (backward), A (turn left), D (turn right)

5. **Auto-Generated Terrain**
   - Procedural terrain using sine waves
   - Hills appear at regular intervals (every ~30 units / 300m)
   - Terrain has grass on the sides and a dusty road in the middle
   - Jeep follows terrain height, going up and down hills

6. **Particle Effects**
   - Dust particles spawn behind the jeep when moving
   - Fine dust particles create a visible cloud effect
   - Particles fade out and float upward over time
   - More particles spawn when moving faster

7. **Transparency**
   - Semi-transparent windows on the jeep
   - Uses alpha blending for realistic transparency
   - Transparent objects are drawn last (after opaque objects)

## How to Run

1. Make sure you have a web server running (you can't just open the HTML file directly due to CORS)
2. I used Python's http server: `python3 -m http.server 8000`
3. Open your browser and go to `http://localhost:8000`
4. The game should load and you can start driving!

## Controls

- **W** - Move forward
- **S** - Move backward  
- **A** - Turn left
- **D** - Turn right

## Technical Details

### Files Structure
- `index.html` - Main HTML file
- `main.js` - Main game logic, rendering, and controls
- `geometry.js` - Geometry definitions (cubes, terrain, path)
- `utils.js` - Helper functions for shaders and texture loading
- `gl-matrix-min.js` - Matrix math library
- `static/` - Folder with texture images (grass.jpg, metal.jpg)

### Implementation Notes

**Parent-Child Hierarchy:**
I implemented this by saving the jeep body's transformation matrix and then using it as the base for all child objects (wheels, headlights). This way, when the jeep moves or rotates, all children automatically follow.

**Phong Lighting:**
The lighting is calculated in the fragment shader. I calculate ambient, diffuse, and specular components separately and combine them. The headlights are point lights that move with the jeep, and the turn signals are additional point lights that only activate when turning.

**Terrain Generation:**
The terrain height is calculated using a function that creates periodic hills. The road path is a separate mesh that overlays the grass terrain, creating the dusty road effect.

**Particle System:**
Particles are stored in an array. Each frame, new particles are spawned behind the jeep, and existing particles are updated (fade out, float up, drift). Dead particles are removed to keep performance good.

**Transparency:**
I enable alpha blending and make sure to draw opaque objects first, then transparent objects last. This prevents rendering issues.

## Challenges I Faced

1. **Getting the parent-child hierarchy right** - Took me a while to figure out how to properly save and reuse transformation matrices
2. **Making particles visible** - Had to experiment with particle size, color, and opacity to make them look like dust
3. **Lighting getting too dark** - Had to balance ambient light with headlight brightness so you can see in the dark but headlights still work
4. **Camera following terrain** - Made the camera height adjust with terrain so you can see the jeep going up/down hills

## What I Learned

- How to use WebGL for 3D graphics
- Matrix transformations and parent-child relationships
- Phong lighting model implementation
- Particle systems
- Texture mapping and blending
- Camera systems for 3D games

## Future Improvements (if I had more time)

- Add more detailed jeep model (instead of just cubes)
- Add sound effects
- Add more terrain features (rocks, trees)
- Improve particle system (maybe use billboards)
- Add day/night cycle
- Add more camera angles

## Credits

- Used gl-matrix library for matrix math
- Textures from sample data directory
- Learned from WebGL tutorials online (cited in code comments where applicable)

---

This project was created for my Computer Graphics class. All code was written by me, with help from online tutorials and documentation.
