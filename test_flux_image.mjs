import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

async function testFluxSchnell() {
  console.log("Testing Flux Schnell image generation...");
  console.log("API Token present:", !!process.env.REPLICATE_API_TOKEN);
  
  try {
    const prompt = "album cover art, professional music artwork, high quality, artistic, inspired by \"Sunset Dreams\", pop music, colorful, bright, energetic, contemporary, vibrant colors, modern design, eye-catching";
    
    console.log("\nGenerating image with prompt:");
    console.log(prompt);
    console.log("\nCalling Replicate API...");
    
    const output = await replicate.run(
      "black-forest-labs/flux-schnell",
      {
        input: {
          prompt: prompt,
          num_outputs: 1,
          aspect_ratio: "1:1",
          output_format: "png",
          output_quality: 90,
        },
      }
    );
    
    console.log("\n✅ Success! Output type:", typeof output);
    console.log("Output is array:", Array.isArray(output));
    
    if (Array.isArray(output) && output.length > 0) {
      const firstOutput = output[0];
      console.log("\nFirst output type:", typeof firstOutput);
      console.log("First output constructor:", firstOutput?.constructor?.name);
      console.log("First output:", firstOutput);
      
      // Try to extract URL
      if (firstOutput && typeof firstOutput === 'object') {
        console.log("\nObject keys:", Object.keys(firstOutput));
        console.log("Has 'url' property:", 'url' in firstOutput);
        
        if ('url' in firstOutput) {
          console.log("URL property:", firstOutput.url);
        }
        
        if (typeof firstOutput.toString === 'function') {
          console.log("toString():", firstOutput.toString());
        }
      }
    }
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
  }
}

testFluxSchnell();

