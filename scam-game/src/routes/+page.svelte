<script>
  import { goto } from '$app/navigation'; // SvelteKit's built-in navigation helper

  let userInput = '';
  let isLoading = false; // New state variable to show loading indicator
  let errorMessage = ''; // New state variable for error messages

  async function sendToAIAndNavigate() {
    errorMessage = ''; // Clear previous errors
    if (!userInput.trim()) {
      errorMessage = 'Please enter some text to generate a scenario!';
      return;
    }

    isLoading = true; // Show loading indicator
    try {
      const response = await fetch('/api/ai-generate', { // <-- New endpoint!
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: userInput }) // Send the user's prompt
      });

      if (response.ok) {
        const aiResponse = await response.json(); // Get the parsed JSON from our backend
        console.log("AI Generation successful:", aiResponse);

        // Store the AI response in localStorage for the success page to pick up
        // localStorage is a simple way for browsers to store key-value pairs
        // that persist across page loads (but is cleared if user clears cache).
        // Good for temporary data between pages.
        localStorage.setItem('aiScenarioData', JSON.stringify(aiResponse));

        // Navigate to the success page
        await goto('/success');

      } else {
        const errorData = await response.json();
        console.error("AI Generation failed:", response.status, errorData);
        errorMessage = 'Failed to generate scenario: ' + (errorData.details || errorData.error || 'Unknown error');
      }

    } catch (error) {
      console.error("Network or other error during AI generation:", error);
      errorMessage = 'An error occurred. Please check your internet connection.';
    } finally {
      isLoading = false; // Hide loading indicator
    }
  }
</script>

<div class="flex flex-col gap-4 max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-lg">
  <label for="my-input" class="block text-gray-700 font-bold mb-2">
    Describe the scenario you want (e.g., "A long-lost relative contacts me", "A too-good-to-be-true job offer"):
  </label>

  <input
    type="text"
    id="my-input"
    bind:value={userInput}
    placeholder="Describe a scenario idea..."
    class="w-full p-2 border border-gray-300 rounded
           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  />

  <button
    on:click={sendToAIAndNavigate}
    disabled={isLoading} 
    class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded
           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
           transition ease-in-out duration-150
           {isLoading ? 'opacity-50 cursor-not-allowed' : ''}" 
  >
    {isLoading ? 'Generating...' : 'Generate Scenario'} <!-- Dynamic button text -->
  </button>

  {#if errorMessage} <!-- Display error message if present -->
    <p class="text-red-600 text-sm mt-2">{errorMessage}</p>
  {/if}

  <p class="text-lg font-semibold text-gray-700 mt-4">
    Current idea: <span class="text-blue-600">{userInput}</span>
  </p>
</div>