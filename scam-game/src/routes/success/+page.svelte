<!-- src/routes/success/+page.svelte -->
<script lang="ts"> // <-- Add lang="ts" to enable TypeScript in Svelte script
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  // 1. FIX: Define a TypeScript interface (or type) for your expected AI response structure
  interface ScenarioData {
    scenario: string;
    decision_point: string;
    is_scam: boolean;
    explanation: string[]; // Array of strings
  }

  // 2. FIX: Explicitly type scenarioData as ScenarioData or null
  let scenarioData: ScenarioData | null = null;
  let displayError: string = ''; // Explicitly type as string

  onMount(() => {
    const storedData = localStorage.getItem('aiScenarioData');
    if (storedData) {
      try {
        // 3. FIX: Cast the parsed JSON to your defined interface
        scenarioData = JSON.parse(storedData) as ScenarioData;
        localStorage.removeItem('aiScenarioData');
      } catch (error: unknown) { // 4. FIX: Type error in catch
        console.error("Failed to parse stored AI data:", error);
        displayError = "Could not load scenario data. It might be corrupted or missing. Error: " + ((error instanceof Error) ? error.message : 'unknown');
      }
    } else {
      displayError = "No scenario data found. Please generate one from the home page.";
    }
  });

  function goHome() {
    goto('/');
  }
</script>

<div class="flex flex-col gap-4 max-w-2xl mx-auto mt-8 p-8 bg-white rounded-lg shadow-xl">
  {#if displayError}
    <h1 class="text-3xl font-bold text-red-600 mb-4">Error Loading Scenario</h1>
    <p class="text-lg text-gray-700 mb-6">{displayError}</p>
    <button
      on:click={goHome}
      class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded
             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
             transition ease-in-out duration-150"
    >
      Go Back to Generator
    </button>
  {:else if scenarioData}
    <h1 class="text-4xl font-extrabold text-gray-900 mb-6 text-center">Generated Scenario</h1>

    <div class="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
      <h2 class="text-2xl font-bold text-gray-800 mb-2">Scenario</h2>
      <p class="text-gray-700 leading-relaxed whitespace-pre-wrap">{scenarioData.scenario}</p>
    </div>

    <div class="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
      <h2 class="text-2xl font-bold text-gray-800 mb-2">Decision Point</h2>
      <p class="text-blue-700 font-semibold text-xl">{scenarioData.decision_point}</p>
    </div>

    <!-- Display is_scam and explanation for development/testing only -->
    <div class="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
      <h2 class="text-2xl font-bold text-gray-800 mb-2">Internal Game Logic (for Debugging)</h2>
      <p class="text-red-700 font-bold mb-2">Is Scam: {scenarioData.is_scam ? 'TRUE' : 'FALSE'}</p>
      <h3 class="text-xl font-semibold text-gray-700 mb-1">Explanation:</h3>
      <ul class="list-disc list-inside text-gray-600">
        {#each scenarioData.explanation as point}
          <li>{point}</li>
        {/each}
      </ul>
    </div>

    <button
      on:click={goHome}
      class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg
             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
             transition ease-in-out duration-150 mt-4"
    >
      Generate Another Scenario
    </button>
  {:else}
    <p class="text-center text-gray-500">Loading scenario data...</p>
  {/if}
</div>