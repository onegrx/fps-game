var map = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 0, 0, 0, 0, 0, 1, 1, 1],
    [1, 1, 0, 0, 2, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 2, 0, 0, 0, 1],
    [1, 0, 0, 2, 0, 0, 2, 0, 0, 1],
    [1, 0, 0, 0, 2, 0, 0, 0, 1, 1],
    [1, 1, 1, 0, 0, 0, 0, 1, 1, 1],
    [1, 1, 1, 0, 0, 1, 0, 0, 1, 1],
    [1, 1, 1, 1, 1, 1, 0, 0, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

var mapW = map.length,
    mapH = map[0].length;

var WIDTH = window.innerWidth,
    HEIGHT = window.innerHeight,
    ASPECT = WIDTH / HEIGHT,
    UNIT_SIZE = 250,
    WALL_HEIGHT = UNIT_SIZE / 3,
    MOVE_SPEED = 100,
    LOOK_SPEED = 0.075,
    BULLET_MOVE_SPEED = MOVE_SPEED * 5,
    NUM_AI = 5,
    PROJECTILEDAMAGE = 20; //TODO


var t = THREE;
var scene, cam, renderer, controls, clock, projector;
var runAnim = true,
    mouse = {x: 0, y: 0},
    kills = 0,
    health = 100;

var healthCube, lastHealthPickup = 0;

// Initialize and run on document ready
$(document).ready(function () {
    $('body').append('<div id="intro">Click to start</div>');
    $('#intro')
        .css({width: '100%', height: '100%'})
        .one('click', function (e) {
            e.preventDefault();
            $(this).fadeOut();
            init();
            animate();
        });

});

// Setup
function init() {
    clock = new t.Clock(); // Used in render() for controls.update()
    projector = new t.Projector(); // Used in bullet projection
    scene = new t.Scene(); // Holds all objects in the canvas
    scene.fog = new t.FogExp2(0xD6F1FF, 0.002); // color, density

    // Set up camera
    cam = new t.PerspectiveCamera(50, ASPECT, 1, 10000); // FOV, aspect, near, far
    cam.position.y = UNIT_SIZE * .2;
    scene.add(cam);

    // Camera moves with mouse, flies around with WASD/arrow keys
    controls = new t.FirstPersonControls(cam);
    controls.movementSpeed = MOVE_SPEED;
    controls.lookSpeed = LOOK_SPEED;
    controls.lookVertical = false; // Temporary solution; play on flat surfaces only
    controls.noFly = true;

    // World objects
    setupScene();

    // Artificial Intelligence
    setupAI();

    // Handle drawing as WebGL (faster than Canvas but less supported)
    renderer = new t.WebGLRenderer();
    renderer.setSize(WIDTH, HEIGHT);

    // Add the canvas to the document
    renderer.domElement.style.backgroundColor = '#D6F1FF'; // easier to see
    document.body.appendChild(renderer.domElement);

    // Track mouse position so we know where to shoot
    document.addEventListener('mousemove', onDocumentMouseMove, false);

    // Shoot on click
    $(document).click(function (e) {
        e.preventDefault;
        if (e.which === 1) { // Left click only
            createBullet(undefined, false);
        }
    });

    // Display HUD
    $('body').append('<div id="hud"><p>Health: <span id="health">100</span><br />Score: <span id="score">0</span></p></div>');

    // Set up "hurt" flash
    $('body').append('<div id="hurt"></div>');
    $('#hurt').css({width: WIDTH, height: HEIGHT,});
}

// Helper function for browser frames
function animate() {
    if (runAnim) {
        requestAnimationFrame(animate);
    }
    render();
}

// Update and display
function render() {
    var delta = clock.getDelta(), speed = delta * BULLET_MOVE_SPEED;
    var aispeed = delta * MOVE_SPEED;
    controls.update(delta); // Move camera

    // Rotate the health cube
    healthcube.rotation.x += 0.004
    healthcube.rotation.y += 0.008;
    // Allow picking it up once per minute
    if (Date.now() > lastHealthPickup + 60000) {
        if (distance(cam.position.x, cam.position.z, healthcube.position.x, healthcube.position.z) < 15 && health != 100) {
            health = Math.min(health + 50, 100);
            $('#health').html(health);
            lastHealthPickup = Date.now();
        }
        healthcube.material.wireframe = false;
    }
    else {
        healthcube.material.wireframe = true;
    }

    // Update bullets. Walk backwards through the list so we can remove items.
    for (var i = bullets.length - 1; i >= 0; i--) {
        var b = bullets[i], p = b.position, d = b.ray.direction;
        if (checkWallCollision(p)) {
            bullets.splice(i, 1);
            scene.remove(b);
            continue;
        }
        // Collide with AI
        var hit = false;
        for (var j = ai.length - 1; j >= 0; j--) {
            var a = ai[j];
            var v = a.geometry.vertices[0];
            var c = a.position;
            var x = Math.abs(v.x), z = Math.abs(v.z);
            //console.log(Math.round(p.x), Math.round(p.z), c.x, c.z, x, z);
            if (p.x < c.x + x && p.x > c.x - x &&
                p.z < c.z + z && p.z > c.z - z &&
                b.owner != a) {
                bullets.splice(i, 1);
                scene.remove(b);
                a.health -= PROJECTILEDAMAGE;
                var color = a.material.color, percent = a.health / 100;
                a.material.color.setRGB(
                    percent * color.r,
                    percent * color.g,
                    percent * color.b
                );
                hit = true;
                break;
            }
        }
        // Bullet hits player
        if (distance(p.x, p.z, cam.position.x, cam.position.z) < 25 && b.owner != cam) {
            $('#hurt').fadeIn(75);
            health -= 10;
            if (health < 0) health = 0;
            val = health < 25 ? '<span style="color: darkRed">' + health + '</span>' : health;
            $('#health').html(val);
            bullets.splice(i, 1);
            scene.remove(b);
            $('#hurt').fadeOut(350);
        }
        if (!hit) {
            b.translateX(speed * d.x);
            //bullets[i].translateY(speed * bullets[i].direction.y);
            b.translateZ(speed * d.z);
        }
    }

    // Update AI.
    for (var i = ai.length - 1; i >= 0; i--) {
        var a = ai[i];
        if (a.health <= 0) {
            ai.splice(i, 1);
            scene.remove(a);
            kills++;
            $('#score').html(kills * 100);
            addAI();
        }
        // Move AI
        var r = Math.random();
        if (r > 0.995) {
            a.lastRandomX = Math.random() * 2 - 1;
            a.lastRandomZ = Math.random() * 2 - 1;
        }
        a.translateX(aispeed * a.lastRandomX);
        a.translateZ(aispeed * a.lastRandomZ);
        var c = getMapSector(a.position);
        if (c.x < 0 || c.x >= mapW || c.y < 0 || c.y >= mapH || checkWallCollision(a.position)) {
            a.translateX(-2 * aispeed * a.lastRandomX);
            a.translateZ(-2 * aispeed * a.lastRandomZ);
            a.lastRandomX = Math.random() * 2 - 1;
            a.lastRandomZ = Math.random() * 2 - 1;
        }
        if (c.x < -1 || c.x > mapW || c.z < -1 || c.z > mapH) {
            ai.splice(i, 1);
            scene.remove(a);
            addAI();
        }
        /*
         var c = getMapSector(a.position);
         if (a.pathPos == a.path.length-1) {
         console.log('finding new path for '+c.x+','+c.z);
         a.pathPos = 1;
         a.path = getAIpath(a);
         }
         var dest = a.path[a.pathPos], proportion = (c.z-dest[1])/(c.x-dest[0]);
         a.translateX(aispeed * proportion);
         a.translateZ(aispeed * 1-proportion);
         console.log(c.x, c.z, dest[0], dest[1]);
         if (c.x == dest[0] && c.z == dest[1]) {
         console.log(c.x+','+c.z+' reached destination');
         a.PathPos++;
         }
         */
        var cc = getMapSector(cam.position);
        if (Date.now() > a.lastShot + 750 && distance(c.x, c.z, cc.x, cc.z) < 2) {
            createBullet(a, true);
            a.lastShot = Date.now();
        }
    }

    renderer.render(scene, cam); // Repaint

    // Death
    if (health <= 0) {
        runAnim = false;
        $(renderer.domElement).fadeOut();
        $('#hud, #credits').fadeOut();
        $('#intro').fadeIn();
        $('#intro').html('Ouch! Click to restart...');
        $('#intro').one('click', function () {
            location = location;
            /*
             $(renderer.domElement).fadeIn();
             $('#radar, #hud, #credits').fadeIn();
             $(this).fadeOut();
             runAnim = true;
             animate();
             health = 100;
             $('#health').html(health);
             kills--;
             if (kills <= 0) kills = 0;
             $('#score').html(kills * 100);
             cam.translateX(-cam.position.x);
             cam.translateZ(-cam.position.z);
             */
        });
    }
}

// Set up the objects in the world
function setupScene() {
    var UNITSIZE = 250, units = mapW;
    
   var floor = new t.Mesh(
            new t.CubeGeometry(units * UNITSIZE, 10, units * UNITSIZE),
            new t.MeshPhongMaterial({color: 0xEDCBA0,map: t.ImageUtils.loadTexture('images/floor-1.jpg')})
    );
    scene.add(floor); 

    // Geometry: walls
    var cube = new t.CubeGeometry(UNITSIZE, WALL_HEIGHT, UNITSIZE);
    var materials = [
        new t.MeshPhongMaterial({/*color: 0x00CCAA,*/map: t.ImageUtils.loadTexture('images/wall-1.jpg')}),
        new t.MeshLambertMaterial({/*color: 0xC5EDA0,*/map: t.ImageUtils.loadTexture('images/wall3.jpg')}),
        new t.MeshPhongMaterial({ ambient: 0x050505, color: 0xFBEBCD, specular: 0x555555, shininess: 30}),
    ];
    materials[1].bumpScale = 0.5;
    materials[0].bumpScale = 0.5;
    materials[2].bumpScale = 0.5;

   var light = new THREE.AmbientLight( 0xffffff );
   light.position.set( 0, 1, 1 ).normalize();
   scene.add(light);


    for (var i = 0; i < mapW; i++) {
        for (var j = 0, m = map[i].length; j < m; j++) {
            if (map[i][j]) {
                var wall = new t.Mesh(cube, materials[map[i][j] - 1]);
                wall.position.x = (i - units / 2) * UNITSIZE;
                wall.position.y = WALL_HEIGHT / 2;
                wall.position.z = (j - units / 2) * UNITSIZE;
                scene.add(wall);
            }
        }
    }

    // Health cube
    healthcube = new t.Mesh(
        new t.CubeGeometry(30, 30, 30),
        new t.MeshBasicMaterial({map: t.ImageUtils.loadTexture('images/health.png')})
    );
    healthcube.position.set(-UNITSIZE - 15, 35, -UNITSIZE - 15);
    scene.add(healthcube);

    // Lighting
    var directionalLight1 = new t.DirectionalLight(0xF7EFBE, 0.7);
    directionalLight1.position.set(0.5, 1, 0.5);
    scene.add(directionalLight1);
    var directionalLight2 = new t.DirectionalLight(0xF7EFBE, 0.5);
    directionalLight2.position.set(-0.5, -1, -0.5);
    scene.add(directionalLight2);
}

var ai = [];
var aiGeo = new t.CubeGeometry(40, 40, 40);
function setupAI() {
    for (var i = 0; i < NUM_AI; i++) {
        addAI();
    }
}

function addAI() {
    var c = getMapSector(cam.position);
    var aiMaterial = new t.MeshBasicMaterial({/*color: 0xEE3333,*/map: t.ImageUtils.loadTexture('images/gargamel.jpg')});
    var o = new t.Mesh(aiGeo, aiMaterial);
    do {
        var x = getRandBetween(0, mapW - 1);
        var z = getRandBetween(0, mapH - 1);
    } while (map[x][z] > 0 || (x == c.x && z == c.z));
    x = Math.floor(x - mapW / 2) * UNIT_SIZE;
    z = Math.floor(z - mapW / 2) * UNIT_SIZE;
    o.position.set(x, UNIT_SIZE * 0.15, z);
    o.health = 100;
    //o.path = getAIpath(o);
    o.pathPos = 1;
    o.lastRandomX = Math.random();
    o.lastRandomZ = Math.random();
    o.lastShot = Date.now(); // Higher-fidelity timers aren't a big deal here.
    ai.push(o);
    scene.add(o);
}

function getAIpath(a) {
    var p = getMapSector(a.position);
    do { // Cop-out
        do {
            var x = getRandBetween(0, mapW - 1);
            var z = getRandBetween(0, mapH - 1);
        } while (map[x][z] > 0 || distance(p.x, p.z, x, z) < 3);
        var path = findAIpath(p.x, p.z, x, z);
    } while (path.length == 0);
    return path;
}

/**
 * Find a path from one grid cell to another.
 *
 * @param sX
 *   Starting grid x-coordinate.
 * @param sZ
 *   Starting grid z-coordinate.
 * @param eX
 *   Ending grid x-coordinate.
 * @param eZ
 *   Ending grid z-coordinate.
 * @returns
 *   An array of coordinates including the start and end positions representing
 *   the path from the starting cell to the ending cell.
 */
function findAIpath(sX, sZ, eX, eZ) {
    var backupGrid = grid.clone();
    var path = finder.findPath(sX, sZ, eX, eZ, grid);
    grid = backupGrid;
    return path;
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}

function getMapSector(v) {
    var x = Math.floor((v.x + UNIT_SIZE / 2) / UNIT_SIZE + mapW / 2);
    var z = Math.floor((v.z + UNIT_SIZE / 2) / UNIT_SIZE + mapW / 2);
    return {x: x, z: z};
}

/**
 * Check whether a Vector3 overlaps with a wall.
 *
 * @param v
 *   A THREE.Vector3 object representing a point in space.
 *   Passing cam.position is especially useful.
 * @returns {Boolean}
 *   true if the vector is inside a wall; false otherwise.
 */
function checkWallCollision(v) {
    var c = getMapSector(v);
    return map[c.x][c.z] > 0;
}



var bullets = [];
var sphereMaterial = new t.MeshBasicMaterial({color: 0x0000ff});
var sphereMaterialAI = new t.MeshBasicMaterial({color: 0xff0000});
var sphereGeo = new t.SphereGeometry(5, 1, 8);
function createBullet(obj, ai) {

    if (obj === undefined) {
        obj = cam;
    }

    var sphere;
    if(ai) {
        sphere = new t.Mesh(sphereGeo, sphereMaterialAI);
    }
    else {
        sphere = new t.Mesh(sphereGeo, sphereMaterial);
    }
    sphere.position.set(obj.position.x, obj.position.y * 0.8, obj.position.z);

    if (obj instanceof t.Camera) {
        var vector = new t.Vector3(mouse.x, mouse.y, 1);
        projector.unprojectVector(vector, obj);
        sphere.ray = new t.Ray(
            obj.position,
            vector.sub(obj.position).normalize()
        );
    }
    else {
        var vector = cam.position.clone();
        sphere.ray = new t.Ray(
            obj.position,
            vector.sub(obj.position).normalize()
        );
    }
    sphere.owner = obj;

    bullets.push(sphere);
    scene.add(sphere);

    return sphere;
}

/*
 function loadImage(path) {
 var image = document.createElement('img');
 var texture = new t.Texture(image, t.UVMapping);
 image.onload = function() { texture.needsUpdate = true; };
 image.src = path;
 return texture;
 }
 */

function onDocumentMouseMove(e) {
    e.preventDefault();
    mouse.x = (e.clientX / WIDTH) * 2 - 1;
    mouse.y = -(e.clientY / HEIGHT) * 2 + 1;
}

// Handle window resizing
$(window).resize(function () {
    WIDTH = window.innerWidth;
    HEIGHT = window.innerHeight;
    ASPECT = WIDTH / HEIGHT;
    if (cam) {
        cam.aspect = ASPECT;
        cam.updateProjectionMatrix();
    }
    if (renderer) {
        renderer.setSize(WIDTH, HEIGHT);
    }
    $('#intro, #hurt').css({width: WIDTH, height: HEIGHT,});
});

// Stop moving around when the window is unfocused (keeps my sanity!)
$(window).focus(function () {
    if (controls) controls.freeze = false;
});
$(window).blur(function () {
    if (controls) controls.freeze = true;
});

//Get a random integer between lo and hi, inclusive.
//Assumes lo and hi are integers and lo is lower than hi.
function getRandBetween(lo, hi) {
    return parseInt(Math.floor(Math.random() * (hi - lo + 1)) + lo, 10);
}



