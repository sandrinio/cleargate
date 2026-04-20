<script lang="ts">
  /**
   * RequestsChart — STORY-006-08
   *
   * Chart.js bar chart wrapper. LOAD-BEARING lazy-import invariant:
   *   chart.js/auto is imported ONLY inside onMount — NEVER at module top-level.
   *   This ensures the dashboard `/` route does not include chart.js in its chunk.
   *
   * Design Guide §8:
   *   - bars: --color-primary (#E85C2F), via CSS getComputedStyle
   *   - axis text: #6B7280 (muted)
   *   - grid lines: #ECE8E1 (very low contrast)
   *   - no legend (single series)
   *   - tooltip: "<date>: <count> requests"
   *   - bar border-radius: 6px
   *   - beginAtZero on Y axis
   *   - x grid hidden, y grid shown
   */
  import { onMount } from 'svelte';

  interface DataPoint {
    date: string;
    count: number;
  }

  interface Props {
    data: DataPoint[];
  }

  let { data }: Props = $props();

  let canvasEl: HTMLCanvasElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let chartInstance: any = null;

  onMount(() => {
    let destroyed = false;

    async function init() {
      // Lazy-import — NEVER hoist this to module top-level
      const { Chart } = await import('chart.js/auto');

      if (destroyed || !canvasEl) return;

      // Resolve --color-primary from CSS custom properties
      // Fallback to Design Guide terracotta if CSS var is empty
      const primaryColor =
        getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() ||
        '#E85C2F';

      // Design Guide §8 defaults — set before creating chart instance
      if (Chart.defaults) {
        Chart.defaults.color = '#6B7280';
        Chart.defaults.borderColor = '#ECE8E1';
      }

      chartInstance = new Chart(canvasEl, {
        type: 'bar',
        data: {
          labels: data.map((d) => d.date),
          datasets: [
            {
              data: data.map((d) => d.count),
              backgroundColor: primaryColor,
              borderRadius: 6,
              borderSkipped: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              callbacks: {
                // Tooltip format: "<date>: <count> requests" — no error count (server shape)
                label: (ctx) => `${ctx.parsed.y} requests`,
                title: (items) => (items[0] ? items[0].label : ''),
              },
            },
          },
          scales: {
            x: {
              type: 'category',
              grid: {
                display: false,
              },
              ticks: {
                color: '#6B7280',
              },
            },
            y: {
              beginAtZero: true,
              grid: {
                color: '#ECE8E1',
              },
              ticks: {
                color: '#6B7280',
              },
            },
          },
          elements: {
            bar: {
              borderRadius: 6,
            },
          },
        },
      });
    }

    init();

    return () => {
      destroyed = true;
      if (chartInstance && typeof chartInstance.destroy === 'function') {
        chartInstance.destroy();
        chartInstance = null;
      }
    };
  });

  // Reactively update chart data when props change
  $effect(() => {
    if (!chartInstance) return;
    chartInstance.data.labels = data.map((d) => d.date);
    chartInstance.data.datasets[0].data = data.map((d) => d.count);
    chartInstance.update();
  });
</script>

<!--
  Canvas wrapper: w-full h-64 per blueprint (Design Guide canvas sizing).
  Chart.js responsiveness requires a non-collapsing parent.
-->
<div class="w-full h-64 relative" data-testid="requests-chart">
  <canvas bind:this={canvasEl} style="display:block;width:100%;height:100%;"></canvas>
</div>
