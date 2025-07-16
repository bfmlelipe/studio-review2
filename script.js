document.addEventListener('DOMContentLoaded', () => {
    const waveformContainer = document.getElementById('waveform');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const audioFile = document.getElementById('audioFile');
    const currentTimeSpan = document.getElementById('currentTime');
    const totalDurationSpan = document.getElementById('totalDuration');
    const commentsList = document.getElementById('commentsList');
    const commentText = document.getElementById('commentText');
    const addCommentBtn = document.getElementById('addCommentBtn');

    let wavesurfer = null;
    let comments = [];
    let currentAudioFileName = null; // Nova variável para armazenar o nome do arquivo atual

    // Remova as chaves AUDIO_KEY e COMMENTS_KEY se existirem
    // Agora a chave dos comentários será dinâmica baseada no nome do arquivo
    // const AUDIO_KEY = 'audioCommentsApp_currentAudio';
    // const COMMENTS_KEY = 'audioCommentsApp_comments';

    // --- Wavesurfer.js Initialization ---
    function initializeWavesurfer() {
        if (wavesurfer) {
            wavesurfer.destroy(); // Destroy previous instance if exists
        }
        wavesurfer = WaveSurfer.create({
            container: waveformContainer,
            waveColor: 'violet',
            progressColor: 'purple',
            cursorColor: 'navy',
            barWidth: 3,
            height: 100,
            responsive: true,
            hideScrollbar: true,
            normalize: true, // Normalize the waveform to the maximum peak
        });

        wavesurfer.on('ready', () => {
            totalDurationSpan.textContent = formatTime(wavesurfer.getDuration());
            playPauseBtn.disabled = false;
            // A carga dos comentários agora acontece APÓS o arquivo ser carregado
            // e o currentAudioFileName estiver definido.
        });

        wavesurfer.on('audioprocess', () => {
            currentTimeSpan.textContent = formatTime(wavesurfer.getCurrentTime());
        });

        wavesurfer.on('finish', () => {
            playPauseBtn.textContent = 'Play/Pause'; // Reset button text
        });

        wavesurfer.on('play', () => {
            playPauseBtn.textContent = 'Pause';
        });

        wavesurfer.on('pause', () => {
            playPauseBtn.textContent = 'Play';
        });

        wavesurfer.on('click', (progress) => {
            // Optional: seek to click position on waveform
            // wavesurfer.seekTo(progress);
        });
    }

    // --- Helper Functions ---
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        const pad = (num) => String(num).padStart(2, '0');
        return `${pad(minutes)}:${pad(remainingSeconds)}`;
    }

    function saveComments() {
        if (currentAudioFileName) {
            // Salva os comentários usando o nome do arquivo como parte da chave
            localStorage.setItem(`audioCommentsApp_comments_${currentAudioFileName}`, JSON.stringify(comments));
        }
    }

    function loadComments() {
        if (currentAudioFileName) {
            // Carrega os comentários usando o nome do arquivo como parte da chave
            const storedComments = localStorage.getItem(`audioCommentsApp_comments_${currentAudioFileName}`);
            if (storedComments) {
                comments = JSON.parse(storedComments);
            } else {
                comments = []; // Se não houver comentários para este arquivo, inicia vazio
            }
            displayComments();
        } else {
            comments = [];
            displayComments();
        }
    }

    function displayComments() {
        commentsList.innerHTML = '';
        if (comments.length === 0) {
            commentsList.innerHTML = '<p>Nenhum comentário ainda. Adicione o primeiro!</p>';
            return;
        }

        comments.sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp

        comments.forEach((comment, index) => {
            const commentItem = document.createElement('div');
            commentItem.classList.add('comment-item');

            const timestampSpan = document.createElement('strong');
            timestampSpan.textContent = formatTime(comment.timestamp);
            timestampSpan.title = 'Clique para ir para este tempo';
            timestampSpan.addEventListener('click', () => {
                if (wavesurfer) {
                    wavesurfer.seekTo(comment.timestamp / wavesurfer.getDuration());
                    wavesurfer.play();
                }
            });

            const commentTextParagraph = document.createElement('p');
            commentTextParagraph.textContent = comment.text;

            const deleteButton = document.createElement('button');
            deleteButton.classList.add('delete-comment-btn');
            deleteButton.innerHTML = '&times;'; // 'x' icon
            deleteButton.title = 'Remover comentário';
            deleteButton.addEventListener('click', () => {
                // Ao deletar, precisamos ter certeza de que estamos removendo o item correto
                // Já que a lista é ordenada e o índice pode mudar.
                // É mais robusto usar um identificador único para cada comentário,
                // mas para este protótipo, vamos filtrar pelo timestamp e texto
                // (assumindo que não há comentários idênticos no mesmo timestamp).
                comments = comments.filter(c => !(c.timestamp === comment.timestamp && c.text === comment.text));
                saveComments();
                displayComments();
            });

            commentItem.appendChild(timestampSpan);
            commentItem.appendChild(commentTextParagraph);
            commentItem.appendChild(deleteButton);
            commentsList.appendChild(commentItem);
        });
    }

    function addComment() {
        if (!wavesurfer || !wavesurfer.getDuration()) {
            alert('Por favor, carregue um arquivo de áudio primeiro.');
            return;
        }
        const text = commentText.value.trim();
        if (text) {
            const timestamp = wavesurfer.getCurrentTime();
            comments.push({ timestamp: timestamp, text: text });
            saveComments();
            displayComments();
            commentText.value = ''; // Clear the textarea
        } else {
            alert('O campo de comentário não pode estar vazio.');
        }
    }

    // A função deleteComment foi atualizada para ser mais robusta, mas o filtro no displayComments
    // já lida com a remoção. Você pode manter esta função separada se quiser.
    // function deleteComment(index) {
    //     // Isto é mais robusto se você tiver IDs únicas para comentários
    //     // const commentIdToDelete = comments[index].id;
    //     // comments = comments.filter(c => c.id !== commentIdToDelete);
    //     // Por enquanto, o filtro dentro do event listener do botão de deleção já funciona
    //     // porque 'comment' dentro do forEach é a referência ao objeto original.
    //     saveComments();
    //     displayComments();
    // }


    // --- Event Listeners ---
    playPauseBtn.addEventListener('click', () => {
        if (wavesurfer) {
            wavesurfer.playPause();
        }
    });

    audioFile.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            currentAudioFileName = file.name; // Armazena o nome do arquivo atual
            
            initializeWavesurfer(); // Re-initialize para garantir um estado fresco
            wavesurfer.load(URL.createObjectURL(file));

            // Carrega os comentários específicos para este arquivo APÓS ele ser carregado
            wavesurfer.on('ready', () => {
                loadComments(); // Garante que os comentários são carregados após o áudio estar pronto
            }, { once: true }); // Executa apenas uma vez
        }
    });

    addCommentBtn.addEventListener('click', addComment);

    // Initial load
    initializeWavesurfer();
    // Initially disable play/pause until audio is loaded
    playPauseBtn.disabled = true;
});