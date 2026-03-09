window.addEventListener('load', () => {
    const savedLocation = localStorage.getItem('location');
    const savedMapUrl = localStorage.getItem('mapUrl');

    if (savedLocation && savedMapUrl) {
        document.getElementById('location').value = savedLocation;
        const iframe = document.querySelector('#live-aqi iframe');
        iframe.src = savedMapUrl;

    }
});

document.getElementById('get-aqi').addEventListener('click', () => {
    const location = document.getElementById('location').value.trim();
    if (!location) {
        alert("Please enter a location.");
        return;
    }


    const iframe = document.querySelector('#live-aqi iframe');
    const mapUrl = `https://www.aqicn.org/map/${encodeURIComponent(location)}/`;
    iframe.src = mapUrl;

    // Save the location and map URL to localStorage
    localStorage.setItem('location', location);
    localStorage.setItem('mapUrl', mapUrl);


    fetch(`https://api.waqi.info/feed/${encodeURIComponent(location)}/?token=e52b20dc479791e02b4673f662efb54a4c72d08e`)
        .then(response => {
            if (!response.ok) {
                throw new Error("Failed to fetch AQI data");
            }
            return response.json();
        })
        .then(data => {
            if (!data || !data.data || !data.data.aqi) {
                throw new Error("Invalid AQI data received");
            }

            const aqi = data.data.aqi;
            const category = aqi <= 50 ? "Good" :
                aqi <= 100 ? "Moderate" :
                aqi <= 150 ? "Unhealthy for Sensitive Groups" :
                aqi <= 200 ? "Unhealthy" :
                aqi <= 300 ? "Very Unhealthy" : "Hazardous";

            document.getElementById('aqi-result').innerHTML = `
                <h3>Air Quality Index for ${location}</h3>
                <p><strong>AQI:</strong> ${aqi} (${category})</p>
                <p>${category === "Good" ? "Enjoy the fresh air!" : "Take precautions!"}</p>
            `;

            // Update plant recommendation based on AQI
            const plantDiv = document.getElementById('plant-recommendation');
            let plants = '';

            if (aqi <= 50) {
                plants = '<p>Air is already good! Keep it green with a Snake Plant or Aloe Vera.</p>';
            } else if (aqi <= 100) {
                plants = '<p>Recommended: Areca Palm, Bamboo Palm, or Peace Lily.</p>';
            } else if (aqi <= 200) {
                plants = '<p>Try Spider Plant or Boston Fern to combat pollutants.</p>';
            } else {
                plants = '<p>Consider Hardy plants like Money Plant or Rubber Plant.</p>';
            }

            plantDiv.innerHTML = plants;
        })
        .catch(err => {
            console.error("Error:", err);
            document.getElementById('aqi-result').innerHTML = `<p class="text-danger">Error fetching AQI data. Please try again.</p>`;
        });
});

// Trigger search on pressing Enter in the input field
document.getElementById('location').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent form submission or page reload
        document.getElementById('get-aqi').click(); // Trigger the "Get AQI" button click
    }
});

document.getElementById('contact-form').addEventListener('submit', function (event) {
    event.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const message = document.getElementById('message').value;
    const responseDiv = document.getElementById('form-response');

    fetch('https://aqicn.org/contact', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, message })
    })
        .then(response => {
            if (response.ok) {
                responseDiv.innerHTML = `<p class="text-success">Thank you for contacting us! We'll get back to you soon.</p>`;
                document.getElementById('contact-form').reset();
            } else {
                throw new Error('Failed to send message');
            }
        })
        .catch(error => {
            console.error(error);
            responseDiv.innerHTML = `<p class="text-danger">There was an error sending your message. Please try again later.</p>`;
        });
});
