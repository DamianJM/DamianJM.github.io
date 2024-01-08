$(function() {
    retrieveDefaultValuesFromLocalStorage();
    setupButtonListeners();
});

var infer = function() {
    $('#output').html("Inferring...");
    $("#resultContainer").show();
    $('html').scrollTop(100000);

    getSettingsFromForm(function(settings) {
        settings.error = function(xhr) {
            $('#output').html("").append([
                "Error in Model",
                "",
                "If using a URL,",
                "there may be permission issues",
                "download image then try again."
            ].join("\n"));
        };

        $.ajax(settings).then(function(response) {
            //settings = settings[0];
            if (settings.format == "json" && settings.input == "upload") {
                var pretty = $('<pre>');
                var formatted = JSON.stringify(response, null, 4);

                // Display the JSON response
                //pretty.html(formatted);
                //$('#output').html("").append(pretty);
                //$('html').scrollTop(100000);

                // Count and display the number of detected objects
                var objectCount = response.predictions.length; // Count detected objects
                $('#output').append("<p>Number of detected plaques: " + objectCount + "</p>");

                // loop through and display details of each detected object
                for (var i = 0; i < objectCount; i++) {
                    var object = response.predictions[i];
                    $('#output').append("<p>Plaque " + (i + 1) + ": " + "Confidence = " + object.confidence + "</p>");
                }
            } 

            else if (settings.format == "json" && settings.input == "batch") {
                var objectCount = response.predictions.length;
                $('#output').append("<p>Number of detected plaques: " + objectCount + "</p>");
            }
            
            else {
                var arrayBufferView = new Uint8Array(response);
                var blob = new Blob([arrayBufferView], {
                    'type': 'image/jpeg'
                });
                var base64image = window.URL.createObjectURL(blob);

                var img = $('<img/>');
                img.get(0).onload = function() {
                    $('html').scrollTop(100000);
                };
                img.attr('src', base64image);
                $('#output').html("").append(img);
            }
        });
    });
};

var retrieveDefaultValuesFromLocalStorage = function() {
	try {
		var api_key = localStorage.getItem("rf.api_key");
		var model = localStorage.getItem("rf.model");
		var format = localStorage.getItem("rf.format");

		if (api_key) $('#api_key').val(api_key);
		if (model) $('#model').val(model);
		if (format) $('#format').val(format);
	} catch (e) {
		// localStorage disabled
	}

	$('#model').change(function() {
		localStorage.setItem('rf.model', $(this).val());
	});

	$('#api_key').change(function() {
		localStorage.setItem('rf.api_key', $(this).val());
	});

	$('#format').change(function() {
		localStorage.setItem('rf.format', $(this).val());
	});
};

var setupButtonListeners = function() {
	// run inference when the form is submitted
    $('#CameraContainer').hide();
    $('#batchfileSelectionContainer').hide();
    $('#urlContainer').hide();
    $('#imageOptions').hide();
	$('#inputForm').submit(function() {
		infer();
		return false;
	});

	// make the buttons blue when clicked
	// and show the proper "Select file" or "Enter url" state
	$('.bttn').click(function() {
		$(this).parent().find('.bttn').removeClass('active');
		$(this).addClass('active');
        

		if($('#computerButton').hasClass('active')) {
			$('#fileSelectionContainer').show();
			$('#urlContainer').hide();
			$('#CameraContainer').hide();
            $('#imageButton').show();
            $('#batchfileSelectionContainer').hide();
		} 
		else if($('#batchButton').hasClass('active')) {
			$('#fileSelectionContainer').hide();
			$('#urlContainer').hide();
			$('#CameraContainer').hide();
            $('#imageButton').hide();
            $('#batchfileSelectionContainer').show();
            $('#jsonButton').addClass('active');
		} 
		else {
			$('#fileSelectionContainer').hide();
			$('#urlContainer').show();
			$('#CameraContainer').hide();
            $('#imageButton').show();
            $('#batchfileSelectionContainer').hide();
		}

		if($('#jsonButton').hasClass('active')) {
			$('#imageOptions').hide();
		} else {
			$('#imageOptions').hide();
		}

		return false;
	});

	// wire styled button to hidden file input
	$('#fileMock').click(function() {
		$('#file').click();
	});
    $('#batchfileMock').click(function() {
		$('#batchfile').click();
	});

	// camera buttons

	var openCameraButton = document.getElementById("openCameraButton");
	openCameraButton.addEventListener("click", function () {
		openCamera()
			.then(function (capturedImage) {

				// Store the captured image data URL in a variable
				var capturedImageDataUrl = capturedImage.split(",")[1];
				console.log("Captured Image Data");
			})
			.catch(function (error) {
				console.error("Error capturing image:", error);
			});
	});

	// grab the filename when a file is selected
	$("#file").change(function() {
		var path = $(this).val().replace(/\\/g, "/");
		var parts = path.split("/");
		var filename = parts.pop();
		$('#fileName').val(filename);
	});

    $("#batchfile").change(function() {
        var filenames = [];
        for (var i = 0; i < this.files.length; i++) {
            var path = this.files[i].name;
            var parts = path.split("/");
            var filename = parts.pop();
            filenames.push(filename);
        }
	$('#batchfileName').val(filenames.join(", "));
    });
};

var getSettingsFromForm = function(cb) {
    var settings = {
        method: "POST",
    };

    var parts = [
        "https://detect.roboflow.com/",
        "phage-plaque-final",
        "/", 1, "?api_key=5g5ou9dePfDOGuW1dTKa"
    ];

    var classes = $('#classes').val();
    if (classes) parts.push("&classes=" + classes);

    var confidence = $('#confidence').val();
    if (confidence) parts.push("&confidence=" + confidence);

    var overlap = $('#overlap').val();
    if (overlap) parts.push("&overlap=" + overlap);

    var format = $('#format .active').attr('data-value');
    parts.push("&format=" + format);
    settings.format = format;

    if (format == "image") {
        var labels = $('#labels .active').attr('data-value');
        if (labels) parts.push("&labels=on");

        var stroke = $('#stroke .active').attr('data-value');
        if (stroke) parts.push("&stroke=" + stroke);

        settings.xhr = function() {
            var override = new XMLHttpRequest();
            override.responseType = 'arraybuffer';
            return override;
        }
    }

    var method = $('#method .active').attr('data-value');
    if (method == "upload") {
        settings.input = "upload";
        var file = $('#file').get(0).files && $('#file').get(0).files.item(0);
        if (!file) return alert("Please select a file.");
        console.log(file);

        getBase64fromFile(file).then(function(base64image) {
            settings.url = parts.join("");
            settings.data = base64image;

            console.log(settings);
            cb(settings);
        });
    } 
    else if (method == "batch") {
        settings.input = "batch";
        var files = $('#batchfile').get(0).files;
        if (!files || files.length === 0) return alert("Please select one or more files.");  

        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            getBase64fromFile(file).then(function(base64image) {
                settings.url = parts.join("");
                settings.data = base64image;
                console.log(settings);
                cb(settings);
        });
    }
    }
    else if (method == "camera") {
        openCamera()
            .then(function(capturedImage) {
                // Ensure that capturedImage is defined
                if (capturedImage) {
                    // Optionally, resize the image before resolving
                    return resizeImage(capturedImage);
                } else {
                    return Promise.reject("Error capturing image: Image is undefined");
                }
            })
            .then(function(resizedImage) {
                // Continue with the resized image
                settings.url = parts.join("");
                settings.data = resizedImage;
                console.log(settings);
                cb(settings);
            })
            .catch(function(error) {
                alert(error);
            });
    } else {
        settings.input = "url";
        var url = $('#url').val();
        if (!url) return alert("Please enter an image URL");

        parts.push("&image=" + encodeURIComponent(url));

        settings.url = parts.join("");
        console.log(settings);
        cb(settings);
    }
};

// Camera functions

function openCamera() {
	return new Promise(function (resolve, reject) {
		navigator.mediaDevices.getUserMedia({ video: true })
			.then(function (stream) {
                var container = document.createElement('div');
                container.classList.add('camera-container'); // Optional: Add a class for styling
                document.body.appendChild(container);
				var video = document.createElement("video");
                video.classList.add('video');
				container.appendChild(video);
				video.srcObject = stream;
				video.play();
				var captureButton = document.createElement("button");
				captureButton.textContent = "Capture";
                captureButton.classList.add('bttn', 'capture'); // Optional: Add classes for styling
                container.appendChild(captureButton);

				captureButton.addEventListener("click", function () {
					captureImageFromCamera(video)
						.then(function (capturedImage) {
							// Stop the camera stream
							stream.getTracks().forEach(track => track.stop());

							// Remove video and capture button elements
							document.body.removeChild(container);

							resolve(capturedImage);
						})
						.catch(function (error) {
							reject(error);
						});
				});
			})
			.catch(function (error) {
				reject(error);
			});
	});
}

function captureImageFromCamera(video) {
    return new Promise(function (resolve, reject) {
        var canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        var context = canvas.getContext("2d");
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert the captured image to base64
        var capturedImage = canvas.toDataURL("image/jpeg");

        // Optionally, resize the image before resolving
        resizeImage(capturedImage)
            .then(function (resizedImage) {
                resolve(resizedImage);
            })
            .catch(function (error) {
                reject(error);
            });
    });
}

var getBase64fromFile = function(file) {
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();

        reader.onload = function(event) {
            // Create an Image element and set its source to the data URL
            var img = new Image();
            img.src = event.target.result;

            img.onload = function() {
                // Resize the image while maintaining its aspect ratio
                var MAX_SIZE = 1024; // Set the maximum size (adjust as needed)
                var width = img.width;
                var height = img.height;

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                // Create a new canvas with the resized dimensions
                var canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;

                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Convert the canvas content to a base64 string
                var resizedBase64 = canvas.toDataURL('image/jpeg', 0.8); // Adjust quality as needed

                resolve(resizedBase64);
            };

            img.onerror = function(error) {
                reject(error);
            };
        };

        reader.readAsDataURL(file);
    });
};

var resizeImage = function(base64Str) {
    return new Promise(function(resolve, reject) {
        var img = new Image();
        img.src = base64Str;
        img.onload = function() {
            var canvas = document.createElement("canvas");
            var MAX_SIZE = 524288; // 0.5MB in bytes

            var width = img.width;
            var height = img.height;

            // Calculate new dimensions while maintaining the aspect ratio
            if (width > height) {
                if (width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                }
            } else {
                if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
            }

            canvas.width = width;
            canvas.height = height;

            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Convert the resized image to base64
            var resizedImage = canvas.toDataURL('image/jpeg', 1.0);

            resolve(resizedImage);
        };

        img.onerror = function(error) {
            reject(error);
        };
    });
};

