import { accio } from './accio';

(async () => {
  const input = document.getElementById('file') as HTMLInputElement;
  const button = document.getElementById('button') as HTMLButtonElement;
  const status = document.getElementById('status') as HTMLSpanElement;

  button.addEventListener('click', async () => {
    const file = input.files?.[0];

    if(!file) {
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    const [data, error, response] = await accio('http://localhost:3000/upload')
      .post()
      .body(formData)
      .progress({
        next: (progress) => {
          status.innerText = `${progress.percent}%`;
        },
      })
      .json();

    console.log({ data, error: error?.data, response });
  });
})();