(function() {

        const CANVAS_SIZE = 280;
        const CANVAS_SCALE = 0.5;

        var width = 320;
        var height = 0;

        var streaming = false;

        var video = null;
        var canvas = null;
        var photo = null;
        var startbutton = null;
        var downloadbutton = null;

        // Load our model.
        const sess = new onnx.InferenceSession();
        const loadingModelPromise = sess.loadModel("model.onnx");

        // predictions on model

        async function updatePredictions() {
            // Get the predictions for the canvas data.
            const imgData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
            const input = new onnx.Tensor(new Float32Array(imgData.data), "float32");
          
            const outputMap = await sess.run([input]);
            const outputTensor = outputMap.values().next().value;
            const predictions = outputTensor.data;
            const maxPrediction = Math.max(...predictions);
          
            for (let i = 0; i < predictions.length; i++) {
              const element = document.getElementById(`prediction-${i}`);
              element.children[0].children[0].style.height = `${predictions[i] * 100}%`;
              element.className =
                predictions[i] === maxPrediction
                  ? "prediction-col top-prediction"
                  : "prediction-col";
            }
          }

        function startup() {
            video = document.getElementById('video');
            canvas = document.getElementById("canvas");
            ctx = canvas.getContext("2d");
            photo = document.getElementById('photo');
            startbutton = document.getElementById('startbutton');
            downloadbutton = document.getElementById('downloadbutton');
            clearbutton = document.getElementById('clearbutton')
            navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false
                })
                .then(function(stream) {
                    video.srcObject = stream;
                    video.play();
                })
                .catch(function(err) {
                    console.log("An error occurred: " + err);
                });

            video.addEventListener('canplay', function(ev) {
                if (!streaming) {
                    height = video.videoHeight / (video.videoWidth / width);

                    if (isNaN(height)) {
                        height = width / (4 / 3);
                    }

                    video.setAttribute('width', width);
                    video.setAttribute('height', height);
                    canvas.setAttribute('width', width);
                    canvas.setAttribute('height', height);
                    streaming = true;
                }
            }, false);

            startbutton.addEventListener('click', function(ev) {
                takepicture();
                ev.preventDefault();
            }, false);

            downloadbutton.addEventListener('click', function() {
                updatePredictions();
            });

            clearbutton.addEventListener('click', function() {
                clearphoto();
            });
            clearphoto();
        }

        function clearphoto() {
            var context = canvas.getContext('2d');
            context.fillStyle = "#AAA";
            context.fillRect(0, 0, canvas.width, canvas.height);

            var data = canvas.toDataURL('image/png');
            photo.setAttribute('src', data);
        }

        function takepicture() {
            var context = canvas.getContext('2d');
            if (width && height) {
                canvas.width = width;
                canvas.height = height;
                context.drawImage(video, 0, 0, width, height);

                var data = canvas.toDataURL('image/png');
                photo.setAttribute('src', data);
            } else {
                clearphoto();
            }
        }

        function downloadPhoto() {
            var dataUrl = canvas.toDataURL('image/png');

            var a = document.createElement('a');
            a.href = dataUrl;
            a.download = 'webcam_photo.png';

            a.click();
        }

        window.addEventListener('load', startup, false);
    })();
