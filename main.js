// Tuning Parameters 
var WALL_STRENGTH = 50;
var RANDOMNESS = 0.2;
var MOUSE_STRENGTH = 0;
var SENSE_STRENGTH = 0.4;
var TRAIL_FADE_RATE = 1;
var NUM_ANTS = 250;
var SPEED = 1;
var BG_IMAGE = new Image();
BG_IMAGE.src = "./RBY_tiles.png";

initSettingsBox();
AntSimulator();

function AntSimulator() {
    // "Globals"
    let c = document.getElementById("antCanvas");
    let ctx = c.getContext("2d");
    let bgC = document.getElementById("bgCanvas");
    let bgCTX = bgC.getContext("2d");
    let drawingC = document.getElementById("drawingCanvas");
    let drawingCTX = drawingC.getContext("2d");
    let ants = makeAnts();

    window.requestAnimationFrame(drawAnts);

    // Canvas resizing operations
    let w = c.width = drawingC.width = bgC.width = window.innerWidth;
    let h = c.height = drawingC.height = bgC.height = window.innerHeight;
    window.onresize = () => {
        c.width = bgC.width = drawingC.width = w = window.innerWidth;;
        c.height = bgC.height = drawingC.height = h = window.innerHeight;
    };

    // Mouse tracking
    let mousePos = new Vector;
    window.onmousemove = (mouseEvent) => {
        mousePos.x = mouseEvent.clientX;
        mousePos.y = mouseEvent.clientY;
        if(drawing){
            drawSpot(mousePos, 5, [0,0,255], drawingCTX)
        }
    }

    // Mouse drawing ability
    let drawing =false;
    window.onmousedown = (e)=>{
        console.log(e.target);
        if(e.target == c){
            drawing =true;
        }
    }

    window.onmouseup = (e)=>{
        drawing = false;
    }

    // Play and pause
    let playState = true;
    let animationID = 0;
    window.onkeydown = (keyEvent) => {
        playState = !playState;
        if (playState) {
            animationID = window.requestAnimationFrame(drawAnts)
        } else {
            console.log("cancelling animation");
            window.cancelAnimationFrame(animationID);
        }
    }

    // Generates and returns a list of random ants
    function makeAnts() {
        let ants = new Array();
        for (let i = 0; i < NUM_ANTS; i++) {
            let pos = new Vector(Math.random() * c.clientWidth, Math.random() * c.clientHeight);
            let vel = new Vector.randomDirection();
            let color = "lightgreen"; //"#" + Math.floor(Math.random() * 16777215).toString(16);
            ants.push(new Ant(pos, vel, color, i));
        }
        console.log(ants)
        return ants;
    }

    // Renders a list of ants
    function drawAnts() {
        // paint over old frame
        ctx.clearRect(0, 0, w, h);
        bgCTX.fillStyle = `rgba(0,0,0,${TRAIL_FADE_RATE * 0.01})`;
        bgCTX.fillRect(0, 0, w, h);

        // Loop Through Ants, calculate the forces acting on each one.
        for (var a of ants) {
            // Add scaled wall force
            a.velocity = a.velocity.add(a.wallForce().multiply(WALL_STRENGTH));
            // Add scaled random wandering force
            a.velocity = a.velocity.add(Vector.randomDirection().multiply(RANDOMNESS));
            // Add repulsion from mouse
            a.velocity = a.velocity.add(a.pointForce(mousePos).multiply(MOUSE_STRENGTH));
            // Add attraction/repulsion to color red in bgCTX
            a.velocity = a.velocity.add(a.senseForce(0, 30, bgCTX).multiply(SENSE_STRENGTH));
            // Add repulsion from blue color in drawingCTX
            a.velocity = a.velocity.add(a.senseForce(2, 10, drawingCTX).multiply(-1));
            // Normalize velocity
            a.velocity = a.velocity.unit();
            // Increment by velocity and draw
            a.position = a.position.add(a.velocity.multiply(SPEED));
            drawSpot(a.position, 5, [255, 0, 0], bgCTX);
            a.render(ctx);
        }
        if (playState) {
            window.requestAnimationFrame(drawAnts);
        }
    }

    // A single ant and all its associated intelligence
    function Ant(pos, velocity, color, id) {
        this.position = pos;
        this.velocity = velocity;
        this.color = color;
        this.id = id;

        // Draws the ant onto the given context
        this.render = function (ctx) {
            ctx.beginPath();
            ctx.arc(this.position.x, this.position.y, 6, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.fillStyle = this.color;
            ctx.fill();
        }

        // Calculate the repulsive force by walls
        this.wallForce = function () {
            let net = new Vector();

            net = net.add(this.pointForce(new Vector(0, this.position.y))); // left wall
            net = net.add(this.pointForce(new Vector(w, this.position.y))); // right wall
            net = net.add(this.pointForce(new Vector(this.position.x, 0))); // top wall
            net = net.add(this.pointForce(new Vector(this.position.x, h))); // top wall

            return net;
        }

        // Calculate an inverse square repulsive force from a point
        this.pointForce = function (b, repel = true) {
            let a2b = this.position.subtract(b);
            let dist = a2b.length();
            return a2b.unit().divide(dist * dist);
        }
        // Samples n times radially in front of the ant, and returns a unit vector that heads towards
        // the highest concentration of the desired color
        this.senseForce = function (colorChannel = 0, distance = 30, context) {
            let numSamples = 4;
            let incrAngle = (Math.PI / 2) / numSamples;

            let midAngle = -this.velocity.toAngle();
            let startAngle = midAngle + Math.PI / 4;
            let result = new Vector();

            for (let i = 0; i < numSamples; i++) {
                let senseVector = Vector.fromAngles(startAngle + incrAngle * i).multiply(distance);
                let senseCoords = senseVector.add(this.position);
                let color = getColorRGB(senseCoords.x, senseCoords.y, context)[colorChannel]
                let weight = (color > 128 ? color : 0) / 255; // ignore totally stale trails
                result = result.add(senseVector.multiply(weight));
            }
            return result.unit();
        }

    }

    // Gets the color from the given drawing context at coordinates (x,y)
    function getColorRGB(x, y, context) {
        // Pixels are stored in a 1D array as 4 byte wide integers
        let pixel = context.getImageData(x, y, 1, 1).data;
        return [pixel[0], pixel[1], pixel[2]];
    }

    // Draws a colored spot onto the bgCTX
    function drawSpot(center, size, color, context) {
        context.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},128)`;
        context.beginPath();
        context.arc(center.x, center.y, size, 0, Math.PI * 2);
        context.fill();
    }
}

function initSettingsBox() {

    dragElement(document.getElementById("settingsBox"));

    function dragElement(elmnt) {
        var pos1 = 0,
            pos2 = 0,
            pos3 = 0,
            pos4 = 0;
        if (document.getElementById(elmnt.id + "header")) {
            // if present, the header is where you move the DIV from:
            document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
        } else {
            // otherwise, move the DIV from anywhere inside the DIV:
            elmnt.onmousedown = dragMouseDown;
        }

        function dragMouseDown(e) {
            e = e || window.event;
            if (e.target == elmnt || e.target == document.getElementById("moveIcon")) {
                e.preventDefault();
                // get the mouse cursor position at startup:
                pos3 = e.clientX;
                pos4 = e.clientY;
                document.onmouseup = closeDragElement;
                // call a function whenever the cursor moves:
                document.onmousemove = elementDrag;
            }
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            // calculate the new cursor position:
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            // set the element's new position:
            elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
            elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            // stop moving when mouse button is released:
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    document.getElementById("mouseStrengthRange")
        .oninput = (e) => {
            MOUSE_STRENGTH = e.target.value;
        }
    document.getElementById("senseStrengthRange")
        .oninput = (e) => {
            SENSE_STRENGTH = -(e.target.value); // flipped sign to make "attract on left hand side"
        }

    document.getElementById("randomnessRange")
        .oninput = (e) => {
            RANDOMNESS = (e.target.value);
        }

    document.getElementById("trailFadeRange")
        .oninput = (e) => {
            TRAIL_FADE_RATE = (e.target.value);
        }



}