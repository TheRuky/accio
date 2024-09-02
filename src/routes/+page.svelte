<script lang="ts">
	import { accio } from '$lib/accio';

	$effect(() => {
		accio('https://jsonplaceholder.typicode.com/posts/1')
			.json()
			.then(([data]) => {
				console.log(data);
			});
	});
</script>

<h1>Accio</h1>
<p>Coming soon...</p>
