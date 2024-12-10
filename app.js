const form = document.getElementById('upload-form');
const fileInput = document.getElementById('uploadFile');
const previewImage = document.getElementById('previewImage');
const resultDiv = document.getElementById('result');
const donutChart = document.getElementById('donutChart');
const checkCountElement = document.getElementById('checkCount');

let model;
let labels;
let checkCount = 0; // ตัวนับจำนวนการตรวจสอบ

// Load model and metadata
(async function loadModel() {
    try {
        model = await tf.loadLayersModel('model/model.json');
        const metadata = await fetch('model/metadata.json').then(res => res.json());
        labels = metadata.labels;
        console.log("Model and metadata loaded successfully!");
    } catch (error) {
        console.error("Error loading model or metadata:", error);
    }
})();

// Display preview image
fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = () => {
            previewImage.src = reader.result;
            previewImage.style.display = "block";
        };
        reader.readAsDataURL(file);
    } else {
        previewImage.style.display = "none";
        previewImage.src = "";
    }
});

// Form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = fileInput.files[0];

    if (!file) {
        alert('Please upload a file!');
        return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
        const img = new Image();
        img.src = reader.result;
        img.onload = async () => {
            try {
                // Preprocess the image
                const tensor = tf.browser.fromPixels(img)
                    .resizeBilinear([224, 224]) // Adjust size as per model input
                    .toFloat()
                    .div(tf.scalar(255.0)) // Normalize to [0, 1]
                    .expandDims();

                // Predict
                const predictions = model.predict(tensor);
                const probabilities = await predictions.data();

                // Sort and get top 5 results
                const sorted = Array.from(probabilities)
                    .map((p, i) => ({ label: labels[i], confidence: p }))
                    .sort((a, b) => b.confidence - a.confidence)
                    .slice(0, 5);

                // Display results
                resultDiv.innerHTML = `<h4>Top 5 Predictions</h4>`;
                sorted.forEach((item, index) => {
                    resultDiv.innerHTML += `
                        <p>${index + 1}. ${item.label} - <strong>${(item.confidence * 100).toFixed(2)}%</strong></p>
                    `;
                });

                // Increment check count and update display
                checkCount++;
                checkCountElement.textContent = checkCount;

                // Create Donut Chart
                const chartData = {
                    labels: sorted.map(item => item.label),
                    datasets: [{
                        data: sorted.map(item => item.confidence * 100),
                        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
                    }]
                };

                if (window.donutChartInstance) {
                    window.donutChartInstance.destroy();
                }

                window.donutChartInstance = new Chart(donutChart, {
                    type: 'doughnut',
                    data: chartData,
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { position: 'top' },
                            tooltip: {
                                callbacks: {
                                    label: function(tooltipItem) {
                                        return `${tooltipItem.label}: ${tooltipItem.raw.toFixed(2)}%`;
                                    }
                                }
                            }
                        }
                    }
                });
            } catch (error) {
                console.error("Error processing image or making predictions:", error);
                resultDiv.innerHTML = "<p class='text-danger'>Error making prediction. Please try again.</p>";
            }
        };
    };
    reader.readAsDataURL(file);
});
