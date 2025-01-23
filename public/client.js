
const joysticks = document.querySelectorAll('.joystick');
const sticks = document.querySelectorAll('.stick');
const dropdownButton = document.getElementById('dropdownButton');
const dropdownContent = document.getElementById('dropdownContent');
const textInput = document.getElementById('textInput');
const submitButton = document.getElementById('submitButton');
// Obtener referencias a los checkboxes
const option1Checkbox = document.getElementById('option1');
const option2Checkbox = document.getElementById('option2');
const option3Checkbox = document.getElementById('option3');
const option4Checkbox = document.getElementById('option4');
const buttons=document.querySelectorAll('.rotating-btn');
// Obtener referencias a los botones
const button1 = document.getElementById('button_1');
const button2 = document.getElementById('button_2');
const button3 = document.getElementById('button_3');
// Obtener referencias a los botones
const button4 = document.getElementById('button_4');
const button5 = document.getElementById('button_5');
const button6 = document.getElementById('button_6');
// Obtener referencias a los botones
const button7 = document.getElementById('button_7');
const button8 = document.getElementById('button_8');
// Obtener el elemento del cuadro de texto
var inputText_pitch = document.getElementById('input-text_pitch');
var inputText_roll = document.getElementById('input-text_roll');
var inputText_yaw = document.getElementById('input-text_yaw');
var inputText_z = document.getElementById('input-text_z');
let lastMessageSentTime=0;
let yaw=0;
let pitch=0;
let roll=0;
let z=-0.15;

let dropdownOpen = false; // Variable para mantener el estado del desplegable

// Store the resulting model in the global scope of our app.
var model = undefined;
var object_detect ='None';

// Before we can use COCO-SSD class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment 
// to get everything needed to run.
// Note: cocoSsd is an external object loaded from our index.html
// script tag import so ignore any warning in Glitch.

cocoSsd.load().then(function (loadedModel) {
  model = loadedModel;
  // Show demo section now model is ready to use.
  console.log("LOADED")
});



const joystickData = [];
const socket = new WebSocket('ws://localhost:8885'); // URL del servidor WebSocket
let buttonState=false;
let buttonStateX=false;
var IA=0;
const infoBoxes = document.querySelectorAll('.info-box');

function sendMessage(message) {
    socket.send(message);
}

// const actionButton=document.getElementById('actionButton');
// actionButton.addEventListener('click',handleActionButtonClick);

dropdownButton.addEventListener('click', () => {
    if (!dropdownOpen) {
        dropdownContent.style.display = 'block'; 
        dropdownOpen = true; // Establecer el estado del desplegable como abierto
        dropdownButton.textContent = 'MODO IA'; //Modo IA
        IA=1;
        textInput.focus(); 
    } 
    else {
        dropdownContent.style.display = 'none'; // Ocultar el desplegable si está abierto
        dropdownOpen = false; // Establecer el estado del desplegable como cerrado
        dropdownButton.textContent = 'MODO MANUAL'; //Modo Manual
        IA=0;
    }
});

// function handleActionButtonClick(){
//     buttonStateX=!buttonStateX;
//     actionButton.classList.toggle('active',buttonStateX);
// }

submitButton.addEventListener('click', () => {
    const textValue = textInput.value;
    console.log('Texto introducido:', textValue);
    object_detect =textValue;
    // Ocultar el desplegable después de enviar el texto
    textInput.value = '';
    textInput.focus(); // Enfocar nuevamente el campo de entrada de texto para permitir más entrada
});

joysticks.forEach((joystick, index) => {
    sticks[index].addEventListener('mousedown', event => handleMouseDown(event, index));
    document.addEventListener('mousemove', event => handleMouseMove(event, index));
    document.addEventListener('mouseup', () => handleMouseUp(index));

    // Inicialmente, los datos del joystick están inactivos
    joystickData.push({ x: 0, y: 0, active: false });
});


function handleMouseDown(event, index) {
    event.preventDefault();
    // Al hacer clic en el joystick, activamos el movimiento del joystick
    joystickData[index].active = true;
    document.addEventListener('mousemove', event => handleMouseMove(event, index));
    updateJoystickPosition(event.clientX, event.clientY, index);
}

function handleMouseMove(event, index) {
    // Solo actualizamos la posición del joystick si está activo
    if (joystickData[index].active) {
        updateJoystickPosition(event.clientX, event.clientY, index);
    }
}

function handleMouseUp(index) {
    // Al soltar el clic del mouse, desactivamos el movimiento del joystick
    joystickData[index].active = false;
    document.removeEventListener('mousemove', () => handleMouseMove(index));
    resetJoystickPosition(index);
}

function updateJoystickPosition(clientX, clientY, index) {
    const joystick = joysticks[index];
    const stick = sticks[index];
    const joystickRect = joystick.getBoundingClientRect();

    let x = clientX - joystickRect.left;
    let y = clientY - joystickRect.top;

    const radius = joystick.offsetWidth / 2 - stick.offsetWidth / 2;
    const distance = Math.sqrt((x - joystick.offsetWidth / 2) ** 2 + (y - joystick.offsetHeight / 2) ** 2);

    if (distance <= radius) {
        stick.style.left = x + 'px';
        stick.style.top = y + 'px';
    } else {
        const angle = Math.atan2(y - joystick.offsetHeight / 2, x - joystick.offsetWidth / 2);
        const newX = joystick.offsetWidth / 2 + Math.cos(angle) * radius;
        const newY = joystick.offsetHeight / 2 + Math.sin(angle) * radius;
        stick.style.left = newX + 'px';
        stick.style.top = newY + 'px';
    }

    // Normalizar los valores x e y entre -1 y 1
    joystickData[index].x = (x - joystick.offsetWidth / 2) / radius;
    joystickData[index].y = (y - joystick.offsetHeight / 2) / radius;
    messageInterval=50;
    const currentTime = Date.now();

    // Enviar datos al servidor WebSocket solo si el joystick está activo
    if (joystickData[index].active && IA==0) {
        if (currentTime - lastMessageSentTime > messageInterval) {
            sendJoystickData(index);
            lastMessageSentTime = currentTime;
        } else {
            console.log('Se está intentando enviar mensajes muy rápido. Espere un poco antes de enviar el siguiente mensaje.');
        }
        
    }
}

function resetJoystickPosition(index) {
    sticks[index].style.left = '50%';
    sticks[index].style.top = '50%';
    joystickData[index] = { x: 0, y: 0, active: false };
    sendJoystickData(index);
}


function sendJoystickData(index) {
    // Convertir los valores a cadena JSON y enviarlos al servidor WebSocket
    const data = JSON.stringify(joystickData[index]);
    console.log(`Joystick ${index + 1} data:`, data);
    // Aquí puedes usar WebSocket para enviar los datos al servidor
    // Por ejemplo:
    // websocket.send(data);
    sendMessage(JSON.stringify({joystickData }));
}


// Agregar manejadores de eventos para cada checkbox
option1Checkbox.addEventListener('change', () => {
    if (option1Checkbox.checked) {
        // Enviar mensaje correspondiente a través del WebSocket
        console.log("Opción 1 seleccionada");
        gait=0;
        sendMessage(JSON.stringify({gait }));
    }
});

option2Checkbox.addEventListener('change', () => {
    if (option2Checkbox.checked) {
        // Enviar mensaje correspondiente a través del WebSocket
        console.log("Opción 2 seleccionada");
        gait=1;
        sendMessage(JSON.stringify({gait }));
    }
});

option3Checkbox.addEventListener('change', () => {
    if (option3Checkbox.checked) {
        // Enviar mensaje correspondiente a través del WebSocket
        console.log("Opción 3 seleccionada");
        gait=2;
        sendMessage(JSON.stringify({gait }));
    }
});

option4Checkbox.addEventListener('change', () => {
    if (option4Checkbox.checked) {
        // Enviar mensaje correspondiente a través del WebSocket
        console.log("Opción 4 seleccionada");
        gait=3;
        sendMessage(JSON.stringify({gait }));
    }
});

document.querySelectorAll('.rotating-btn').forEach(button => {
    button.addEventListener('click', function() {
        document.querySelectorAll('.rotating-btn').forEach(btn => btn.classList.remove('selected'));
        this.classList.add('selected');
    });
});

document.addEventListener('keydown', function(event) {
const keyCode = event.keyCode;
let selectedButton = document.querySelector('.selected');
let buttonNumber = parseInt(selectedButton.getAttribute('data-button-number')); // Obtener el número de botón



if (selectedButton) {
    let rotationAngle = parseFloat(selectedButton.getAttribute('data-rotation')) || 0;

    // Girar hacia la izquierda (tecla 'A' o flecha izquierda)
    if (keyCode === 65 || keyCode === 37)
        rotationAngle -= 10;
    // Girar hacia la derecha (tecla 'D' o flecha derecha)
    else if (keyCode === 68 || keyCode === 39)
        rotationAngle += 10;

    // Aplicar rotación al botón seleccionado
    selectedButton.style.transform = `rotate(${rotationAngle}deg)`;
    selectedButton.setAttribute('data-rotation', rotationAngle);
    infoBoxes[buttonNumber-1].textContent = `KP: ${rotationAngle/1000}`;
    if(IA==0){
        if(buttonNumber==1||buttonNumber==4||buttonNumber==7){
            infoBoxes[buttonNumber-1].textContent = `KP: ${rotationAngle/1000}`;
            data_array_pid=[rotationAngle,buttonNumber];
            console.log(rotationAngle);
            if(buttonNumber==1){
                kp_pitch=rotationAngle/1000;
                sendMessage(JSON.stringify({kp_pitch }));
            }
            if(buttonNumber==4){
                kp_roll=rotationAngle/1000;
                sendMessage(JSON.stringify({ki_pitch }));
            }
            if(buttonNumber==7){
                kp_yaw=rotationAngle/1000;
                sendMessage(JSON.stringify({kp_yaw }));
            }
        }
        if(buttonNumber==2||buttonNumber==5||buttonNumber==8){
            infoBoxes[buttonNumber-1].textContent = `KI: ${rotationAngle/1000}`;
            data_array_pid=[rotationAngle,buttonNumber];
            if(buttonNumber==3){
                ki_pitch=rotationAngle/1000;
                sendMessage(JSON.stringify({ki_pitch }));
            }
            if(buttonNumber==6){
                ki_roll=rotationAngle/1000;
                sendMessage(JSON.stringify({ki_pitch }));
            }
            if(buttonNumber==9){
                ki_yaw=rotationAngle/1000;
                sendMessage(JSON.stringify({ki_yaw }));
            }
        }
        if(buttonNumber==3||buttonNumber==6||buttonNumber==9){
            infoBoxes[buttonNumber-1].textContent = `KD: ${rotationAngle/1000}`;
            data_array_pid=[rotationAngle,buttonNumber]; //CONVERTIR A NUMERO
            if(buttonNumber==3){
                kd_pitch=rotationAngle/1000;
                sendMessage(JSON.stringify({kd_pitch }));
            }
            if(buttonNumber==6){
                kd_pitch=rotationAngle/1000;
                sendMessage(JSON.stringify({kd_pitch }));
            }
            if(buttonNumber==9){
                kd_pitch=rotationAngle/1000;
                sendMessage(JSON.stringify({kd_pitch }));
            }
        }
    }
}});

const img = new Image();
        
socket.onmessage = function(event) {
    // Verificar si el mensaje recibido es una imagen
    console.log("RECIBÍ");

    if (typeof event.data==='object'){
        const blob = new Blob([event.data], { type: 'image/jpeg' });
        // Crear una URL para el blob
        const url = URL.createObjectURL(blob);
        // Establecer la fuente de la imagen
        img.src = url;
        // Actualizar la imagen en el contenedor de imágenes
        document.getElementById('image-container').innerHTML = '';
        document.getElementById('image-container').appendChild(img);
        if(IA==1){

            model.detect(img).then(predictions => {
                console.log(predictions);
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                drawRect(predictions, canvas);
                document.getElementById('image-container').appendChild(canvas);

                for (let i = 0; i < 1; i++) {

                    // Verificar si el elemento actual coincide con el texto específico
                    if (predictions[i].class === object_detect) {

                        console.log(predictions[i].bbox);
                        //Procesar bbox y enviar JSON con coordenadas bbox: [x, y, width, height],
                        const mapeo_1_ia={
                        mapeoia:[{x:0.05,y:0.05*((predictions[i].bbox[0]+(predictions[i].bbox[3]/2))-240)/240,z:-0.135}]};
                        sendMessage(JSON.stringify(mapeo_1_ia));

                    }
                    else{
                        const mapeo_1_ia={
                            mapeoia:[{x:0.0,y:0.0*((predictions[i].bbox[0]+(predictions[i].bbox[3]/2))-240)/240,z:-0.135}]};
                            sendMessage(JSON.stringify(mapeo_1_ia));

                    }

                }
            });
        }
    }
    if(typeof event.data==='string'){
        try {
            // Intentar analizar la cadena JSON
            const jsonData = JSON.parse(event.data);
    
            if (jsonData.ypr) {
               
                // updateYawChart(jsonData.ypr.yaw);
                updatePitchChart(jsonData.ypr[0]);
                updateRollChart(jsonData.ypr[1]);
            } 
            else {
                // Si los datos no coinciden con el formato esperado, imprimir un mensaje de error
                console.log('Mensaje recibido no contiene datos ypr:', event.data);
            }
        } 
        catch (error) {
            // Si no se puede analizar la cadena JSON, imprimir un mensaje de error
            console.log('Error al analizar JSON:', error);
        }
    }
};

const drawRect = (predictions, canvas) => {
    const context = canvas.getContext('2d');
  
    predictions.forEach((prediction) => {
        const [x, y, width, height] = prediction.bbox;
        const text = `${prediction.class}: ${Math.round(prediction.score * 100)}%`;
        const color = '#FF00FF'; // Podemos personalizar el color según nuestras preferencias

        context.strokeStyle = color;
        context.fillStyle = color;
        context.font = '18px Arial';

        context.beginPath();
        context.fillText(text, x, y - 10);
        context.rect(x, y, width, height);
        context.stroke();
    });
  };


  
// Función para actualizar los datos de la gráfica de yaw
function updateYawChart(yawData) {
    // Agregar nuevo dato al final del conjunto de datos de yaw
    yawChart.data.labels.push('');
    yawChart.data.datasets[0].data.push(yawData);
    // Limitar el número de puntos en la gráfica para mantenerla limpia
    const maxDataPoints = 20;
    if (yawChart.data.labels.length > maxDataPoints) {
        yawChart.data.labels.shift();
        yawChart.data.datasets[0].data.shift();
    }
    // Actualizar la gráfica
    yawChart.update();
}

// Función para actualizar los datos de la gráfica de pitch
function updatePitchChart(pitchData) {
    // Agregar nuevo dato al final del conjunto de datos de pitch
    pitchChart.data.labels.push('');
    pitchChart.data.datasets[0].data.push(pitchData);
    // Limitar el número de puntos en la gráfica para mantenerla limpia
    const maxDataPoints = 50;
    if (pitchChart.data.labels.length > maxDataPoints) {
        pitchChart.data.labels.shift();
        pitchChart.data.datasets[0].data.shift();
    }
    // Actualizar la gráfica
    pitchChart.update();
}

// Función para actualizar los datos de la gráfica de roll
function updateRollChart(rollData) {
    // Agregar nuevo dato al final del conjunto de datos de roll
    rollChart.data.labels.push('');
    rollChart.data.datasets[0].data.push(rollData);
    // Limitar el número de puntos en la gráfica para mantenerla limpia
    const maxDataPoints = 50;
    if (rollChart.data.labels.length > maxDataPoints) {
        rollChart.data.labels.shift();
        rollChart.data.datasets[0].data.shift();
        console.log(rollChart.labels[0].data);
    }

    // Actualizar la gráfica
    rollChart.update();
}

// // Inicializar las gráficas de yaw, pitch y roll
// const yawChart = new Chart(document.getElementById('yaw-chart'), {
//     type: 'line',
//     data: {
//         labels: [], // Etiquetas de tiempo (opcional)
//         datasets: [{
//             label: 'Yaw',
//             borderColor: 'blue',
//             data: [], // Datos de yaw
//         }]
//     },
//     options: {
//         responsive: true,
//         maintainAspectRatio: false,
//         layout: {
//             padding: {
//                 left: 100,
//                 right: 10,
//                 top: 10,
//                 bottom: 10
//             }
//         },
//         scales: {
//             y: {
//                 min: 0,
//                 max: 50
//             }
//         }
        
//     }
// });

const pitchChart = new Chart(document.getElementById('pitch-chart'), {
    type: 'line',
    data: {
        labels: [], // Etiquetas de tiempo (opcional)
        datasets: [{
            label: 'Pitch',
            borderColor: 'blue',
            data: [], // Datos de yaw
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: {
                left: 100,
                right: 10,
                top: 10,
                bottom: 10
            }
        },
        scales: {
            y: {
                min: -10,
                max: 50
            }
        }
        
    }
});

const rollChart = new Chart(document.getElementById('roll-chart'), {
    type: 'line',
    data: {
        labels: [], // Etiquetas de tiempo (opcional)
        datasets: [{
            label: 'Roll',
            borderColor: 'blue',
            data: [], // Datos de yaw
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: {
                left: 100,
                right: 10,
                top: 10,
                bottom: 10
            }
        },
        scales: {
            y: {
                min: -10,
                max: 50
            }
        }
        
    }
});


// Agregar eventos de clic a los botones
button1.addEventListener('click', function() {
    console.log('Botón 1 fue pulsado');
    pitch=pitch+0.5;
    actualizarTexto(roll,pitch,yaw,z);
    const positiondata={
    position:[{
        pitch_value:pitch,
        roll_value:roll,
        yaw_value: yaw,
        z_value:z
    }]};
    sendMessage(JSON.stringify(positiondata));
    // Agrega aquí el código que quieras que se ejecute cuando se pulse el botón 1
});

button2.addEventListener('click', function() {
    pitch=pitch-0.5;
    console.log('Botón 2 fue pulsado');
    actualizarTexto(roll,pitch,yaw,z);
    const positiondata={
        position:[{
            pitch_value:pitch,
            roll_value:roll,
            yaw_value: yaw,
            z_value:z
        }]};
        sendMessage(JSON.stringify(positiondata));
    // Agrega aquí el código que quieras que se ejecute cuando se pulse el botón 2
});

button3.addEventListener('click', function() {
    console.log('Botón 3 fue pulsado');
    roll=roll+0.5;
    actualizarTexto(roll,pitch,yaw,z);
    const positiondata={
        position:[{
            pitch_value:pitch,
            roll_value:roll,
            yaw_value: yaw,
            z_value:z
        }]};
        sendMessage(JSON.stringify(positiondata));
    // Agrega aquí el código que quieras que se ejecute cuando se pulse el botón 3
});
button4.addEventListener('click', function() {
    console.log('Botón 3 fue pulsado');
    roll=roll-0.5;
    actualizarTexto(roll,pitch,yaw,z);
    const positiondata={
        position:[{
            pitch_value:pitch,
            roll_value:roll,
            yaw_value: yaw,
            z_value:z
        }]};
        sendMessage(JSON.stringify(positiondata));
    // Agrega aquí el código que quieras que se ejecute cuando se pulse el botón 3
});
button5.addEventListener('click', function() {
    console.log('Botón 3 fue pulsado');
    yaw=yaw+0.5;
    actualizarTexto(roll,pitch,yaw,z);
    const positiondata={
        position:[{
            pitch_value:pitch,
            roll_value:roll,
            yaw_value: yaw,
            z_value:z
        }]};
        sendMessage(JSON.stringify(positiondata));
    // Agrega aquí el código que quieras que se ejecute cuando se pulse el botón 3
});
button6.addEventListener('click', function() {
    console.log('Botón 3 fue pulsado');
    yaw=yaw-0.5;
    actualizarTexto(roll,pitch,yaw,z);
    const positiondata={
        position:[{
            pitch_value:pitch,
            roll_value:roll,
            yaw_value: yaw,
            z_value:z
        }]};
        sendMessage(JSON.stringify(positiondata));
    // Agrega aquí el código que quieras que se ejecute cuando se pulse el botón 3
});
button7.addEventListener('click', function() {
    console.log('Botón 3 fue pulsado');
    z=z+0.005;
    actualizarTexto(roll,pitch,yaw,z);
    const positiondata={
        position:[{
            pitch_value:pitch,
            roll_value:roll,
            yaw_value: yaw,
            z_value:z
        }]};
        sendMessage(JSON.stringify(positiondata));
    // Agrega aquí el código que quieras que se ejecute cuando se pulse el botón 3
});
button8.addEventListener('click', function() {
    console.log('Botón 3 fue pulsado');
    z=z-0.005;
    actualizarTexto(roll,pitch,yaw,z);
    const positiondata={
        position:[{
            pitch_value:pitch,
            roll_value:roll,
            yaw_value: yaw,
            z_value:z
        }]};
        sendMessage(JSON.stringify(positiondata));
    // Agrega aquí el código que quieras que se ejecute cuando se pulse el botón 3
});



// Función para actualizar el texto del cuadro de texto
function actualizarTexto(texto1,texto2,texto3,texto4) {
    inputText_pitch.value ="ROLL: "+ texto1;
    inputText_roll.value="PITCH: "+texto2;
    inputText_yaw.value="YAW: "+texto3;
    inputText_z.value="z: "+texto4;
}

