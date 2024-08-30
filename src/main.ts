import { accio } from './accio';

(async () => {
  const input = document.getElementById('file') as HTMLInputElement;
  const button = document.getElementById('button') as HTMLButtonElement;

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
          console.log(progress);
        },
      })
      .json();

    console.log({ data, error: error?.data, response });
  });
})();