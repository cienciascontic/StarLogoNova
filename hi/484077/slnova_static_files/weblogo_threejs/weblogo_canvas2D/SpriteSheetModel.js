/*
 * A SpriteSheetModel manages a spritesheet along with other information necessary to be able to render
 * an agent from different perspectives. 
 *
 * Note: Not yet integrated into the renderer. The goal of this class is to avoid slowdowns due to cache misses when
 * rendering rotations of a Model. Idea is to keep the whole sprite sheet in memory instead of asking for different 
 * bitmap objects in an array at random, which will not all be in cached memory at once. The plan is for this class
 * to replace Model.js for sprite models generated from 3d models.
 */

