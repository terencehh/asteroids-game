"use strict";
function asteroids() {
    const gameStats = {
        startingLives: 4,
        maxLives: 3,
        maxAsteroids: 11,
        currentAsteroids: 0,
        asteroidsDestroyed: 0,
        asteroidArray: [],
        bulletArray: [],
        keyPressed: ""
    };
    const svg = document.getElementById("canvas");
    let g = new Elem(svg, 'g')
        .attr("transform", "translate(300 300) rotate(170)");
    let ship = new Elem(svg, 'polygon', g.elem)
        .attr("points", "-15,20 15,20 0,-20")
        .attr("style", "fill:lime;stroke:purple;stroke-width:1");
    let lifeDisplay = new Elem(svg, 'text')
        .attr('x', 30).attr('y', 80)
        .attr('fill', '#FFFFFF')
        .attr('height', 100).attr('width', 50)
        .attr('font-size', '40px');
    let scoreDisplay = new Elem(svg, 'text')
        .attr('x', 200).attr('y', 80)
        .attr('fill', '#FFFFFF')
        .attr('height', 150).attr('width', 50)
        .attr('font-size', '40px');
    let endDisplay = new Elem(svg, 'text')
        .attr('x', 150).attr('y', 300)
        .attr('fill', '#FFFFFF')
        .attr('height', 100).attr('width', 50)
        .attr('font-size', '40px');
    const mainInterval = Observable.interval(10).map(() => ({
        gameStats,
        shipValues: /translate\((\d+) (\d+)\) rotate\((\d+)\)/.exec(g.attr("transform"))
    }));
    const mainObservable = mainInterval.takeUntil(mainInterval.filter(_ => gameStats.startingLives <= 1 || gameStats.asteroidsDestroyed >= 8));
    keyInteractions(g, document);
    spawnAsteroids(svg).subscribe(asteroid => {
        animateAsteroids(asteroid);
    });
    displayBoard(scoreDisplay, lifeDisplay);
    bulletAsteroidCollision();
    updateNextRound();
    Observable.interval(10).map(({}) => ({ gameStats })).filter(({ gameStats }) => gameStats.startingLives == 1)
        .map(({}) => endDisplay.elem.textContent = "Game Over!")
        .map(({}) => scoreDisplay.elem.textContent = "Score: " + (1000 * (gameStats.asteroidsDestroyed)).toString())
        .subscribe(() => { lifeDisplay.elem.textContent = "Life: 0"; });
    function keyInteractions(g, document) {
        const keyDown = Observable.fromEvent(document, 'keydown')
            .map(({ code }) => gameStats.keyPressed = code)
            .map(({}) => ({ shipValues: /translate\((\d+) (\d+)\) rotate\((\d+)\)/.exec(g.attr("transform")) }))
            .map(({ shipValues }) => ({ shipValues, gameStats }))
            .filter(({ gameStats }) => gameStats.startingLives > 1)
            .subscribe(() => { });
        const keyUp = Observable.fromEvent(document, 'keyup')
            .map(({}) => gameStats.keyPressed = "")
            .filter(({}) => gameStats.startingLives > 1)
            .subscribe(() => { });
        const keyboardObservable = mainObservable
            .filter(({ gameStats }) => gameStats.keyPressed.length != 0)
            .filter(({ gameStats }) => gameStats.startingLives > 1);
        keyboardObservable.filter(({ gameStats }) => gameStats.keyPressed == "ArrowLeft")
            .subscribe(({ shipValues }) => g.attr("transform", "translate(" + shipValues[1] + " " + shipValues[2] + ") rotate("
            + (Number(shipValues[3]) - 10) % 360 + ")"));
        keyboardObservable.filter(({ gameStats }) => gameStats.keyPressed == "ArrowRight")
            .subscribe(({ shipValues }) => g.attr("transform", "translate(" + shipValues[1] + " " + shipValues[2] + ") rotate("
            + (Number(shipValues[3]) + 10) % 360 + ")"));
        keyboardObservable.filter(({ shipValues }) => Number(shipValues[3]) == 0)
            .subscribe(({ shipValues }) => g.attr("transform", "translate(" + shipValues[1] + " " + shipValues[2] + ") rotate("
            + "360" + ")"));
        keyboardObservable.filter(({ gameStats }) => gameStats.keyPressed == "ArrowUp")
            .map(({ shipValues }) => ({
            x: Math.ceil(((Math.sin((Number(shipValues[3]) * Math.PI) / 180) * 5) + Number(shipValues[1]))),
            y: Math.ceil(((Math.cos((Number(shipValues[3]) * Math.PI) / 180) * -5) + Number(shipValues[2]))),
            shipValues
        }))
            .subscribe(({ x, y, shipValues }) => g.attr("transform", "translate(" + x + " " + y + ") rotate(" + shipValues[3] + ")"));
        keyboardObservable.filter(({ shipValues }) => Number(shipValues[1]) <= 20)
            .subscribe(({ shipValues }) => g.attr("transform", "translate(" + "570" + " " + shipValues[2] + ") rotate(" + shipValues[3] + ")"));
        keyboardObservable.filter(({ shipValues }) => Number(shipValues[2]) <= 20)
            .subscribe(({ shipValues }) => g.attr("transform", "translate(" + shipValues[1] + " " + "570" + ") rotate(" + shipValues[3] + ")"));
        keyboardObservable.filter(({ shipValues }) => Number(shipValues[1]) >= 580)
            .subscribe(({ shipValues }) => g.attr("transform", "translate(" + "30" + " " + shipValues[2] + ") rotate(" + shipValues[3] + ")"));
        keyboardObservable.filter(({ shipValues }) => Number(shipValues[2]) >= 580)
            .subscribe(({ shipValues }) => g.attr("transform", "translate(" + shipValues[1] + " " + "30" + ") rotate(" + shipValues[3] + ")"));
        keyboardObservable.filter(({ gameStats }) => gameStats.keyPressed == "Space")
            .flatMap(({ shipValues }) => {
            const projectile = new Elem(svg, 'circle')
                .attr("cx", Number(shipValues[1]))
                .attr("cy", Number(shipValues[2]))
                .attr("r", 5)
                .attr("fill", "#FFFFFF")
                .attr("collision", "False");
            gameStats.bulletArray.push(projectile);
            return mainObservable.map(({}) => ({ projectile, shipValues }))
                .takeUntil(Observable.interval(5000));
        })
            .map(({ projectile, shipValues }) => ({ projectile,
            xShift: Math.ceil(((Math.sin((Number(shipValues[3]) * Math.PI) / 180) * 5) + Number(projectile.attr("cx")))),
            yShift: Math.ceil(((Math.cos((Number(shipValues[3]) * Math.PI) / 180) * -5) + Number(projectile.attr("cy"))))
        }))
            .filter(({ projectile }) => projectile.attr("collision") == "False")
            .map(({ projectile, xShift, yShift }) => projectile
            .attr("cx", xShift)
            .attr("cy", yShift))
            .subscribe(() => { });
    }
    function spawnAsteroids(svg) {
        const spawnAsteroidsObservable = Observable.interval(10)
            .takeUntil(mainInterval.filter(_ => gameStats.currentAsteroids == gameStats.maxAsteroids + 1))
            .map(({}) => ({ gameStats, shipValues: /translate\((\d+) (\d+)\) rotate\((\d+)\)/.exec(g.attr("transform")) }));
        return spawnAsteroidsObservable
            .flatMap(({ gameStats }) => {
            const asteroid = new Elem(svg, 'circle')
                .attr("fill", "#000000");
            gameStats.currentAsteroids += 1;
            gameStats.asteroidArray.push(asteroid);
            return spawnAsteroidsObservable.map(({ shipValues, gameStats }) => ({ shipValues, gameStats, asteroid }));
        })
            .map(({ asteroid }) => asteroid
            .attr("cx", Math.floor(Math.random() * 100) < 50 ? 100 : 500)
            .attr("cy", Math.floor(Math.random() * 100) < 50 ? 100 : 500)
            .attr("r", 20)
            .attr("fill", "#808080")
            .attr("rotation", (Math.floor(Math.random() * 360)).toString())
            .attr("direction", (Math.random() < 0.5 ? -2 : 2))
            .attr("removedState", "False"));
    }
    function animateAsteroids(asteroid) {
        const animateAsteroidsObservable = Observable.interval(100).map(({}) => ({ shipValues: /translate\((\d+) (\d+)\) rotate\((\d+)\)/.exec(g.attr("transform")), gameStats, asteroid }))
            .filter(({ gameStats }) => gameStats.startingLives > 1)
            .takeUntil(Observable.interval(10).map(({}) => ({ asteroid }))
            .filter(({ asteroid }) => asteroid.attr("removedState") == "True"));
        animateAsteroidsObservable
            .filter(({ shipValues, asteroid }) => (Number(shipValues[1]) >= Number(asteroid.attr("cx")) - 20 && Number(shipValues[1]) <= Number(asteroid.attr("cx")) + 20) &&
            (Number(shipValues[2]) >= Number(asteroid.attr("cy")) - 20 && Number(shipValues[2]) <= Number(asteroid.attr("cy")) + 20))
            .map(({ asteroid }) => asteroid.attr("removedState", "True").attr("cx", -1000).attr("cy", -1000).elem.remove())
            .map(() => gameStats.startingLives -= 1)
            .map(() => gameStats.asteroidsDestroyed += 1)
            .subscribe(() => { });
        animateAsteroidsObservable
            .filter(({ asteroid }) => asteroid.attr("removedState") == "False")
            .filter(({ asteroid }) => Number(asteroid.attr("cx")) >= 580)
            .subscribe(({ asteroid }) => asteroid
            .attr("cx", Math.ceil(Math.sin((Number(asteroid.attr("rotation")) * Math.PI) / 180) * Number(asteroid.attr("direction")) + 20))
            .attr("cy", Math.ceil(Math.cos((Number(asteroid.attr("rotation")) * Math.PI) / 180) * Number(asteroid.attr("direction")) + Number(asteroid.attr("cy")))));
        animateAsteroidsObservable
            .filter(({ asteroid }) => asteroid.attr("removedState") == "False")
            .filter(({ asteroid }) => Number(asteroid.attr("cx")) <= 20)
            .subscribe(({ asteroid }) => asteroid
            .attr("cx", Math.ceil(Math.sin((Number(asteroid.attr("rotation")) * Math.PI) / 180) * Number(asteroid.attr("direction")) + 580))
            .attr("cy", Math.ceil(Math.cos((Number(asteroid.attr("rotation")) * Math.PI) / 180) * Number(asteroid.attr("direction")) + Number(asteroid.attr("cy")))));
        animateAsteroidsObservable
            .filter(({ asteroid }) => asteroid.attr("removedState") == "False")
            .filter(({ asteroid }) => Number(asteroid.attr("cy")) >= 580)
            .subscribe(({ asteroid }) => asteroid
            .attr("cx", Math.ceil(Math.sin((Number(asteroid.attr("rotation")) * Math.PI) / 180) * Number(asteroid.attr("direction")) + Number(asteroid.attr("cx"))))
            .attr("cy", Math.ceil(Math.cos((Number(asteroid.attr("rotation")) * Math.PI) / 180) * Number(asteroid.attr("direction")) + 20)));
        animateAsteroidsObservable
            .filter(({ asteroid }) => asteroid.attr("removedState") == "False")
            .filter(({ asteroid }) => Number(asteroid.attr("cy")) <= 20)
            .subscribe(({ asteroid }) => asteroid
            .attr("cx", Math.ceil(Math.sin((Number(asteroid.attr("rotation")) * Math.PI) / 180) * Number(asteroid.attr("direction")) + Number(asteroid.attr("cx"))))
            .attr("cy", Math.ceil(Math.cos((Number(asteroid.attr("rotation")) * Math.PI) / 180) * Number(asteroid.attr("direction")) + 580)));
        animateAsteroidsObservable
            .filter(({ asteroid }) => asteroid.attr("removedState") == "False")
            .subscribe(({ asteroid }) => asteroid
            .attr("cx", Math.floor(Math.sin((Number(asteroid.attr("rotation")) * Math.PI) / 180) * Number(asteroid.attr("direction")) + Number(asteroid.attr("cx"))))
            .attr("cy", Math.floor(Math.cos((Number(asteroid.attr("rotation")) * Math.PI) / 180) * Number(asteroid.attr("direction")) + Number(asteroid.attr("cy")))));
    }
    function bulletAsteroidCollision() {
        mainObservable.map(({ gameStats }) => (findCollisions(gameStats.asteroidArray, gameStats.bulletArray)))
            .filter((collisionList) => collisionList.length > 0)
            .forEach((collisionList) => gameStats.asteroidArray[collisionList[0]].attr("cx", -2000).attr("cy", -2000).attr("collision", "True").elem.remove())
            .forEach((collisionList) => gameStats.bulletArray[collisionList[1]].attr("cx", -1000).attr("cy", -1000).attr("removedState", "True").elem.remove())
            .forEach((collisionList) => gameStats.asteroidArray.splice(collisionList[0], 1))
            .forEach((collisionList) => gameStats.bulletArray.splice(collisionList[1], 1))
            .map(() => gameStats.asteroidsDestroyed += 1)
            .subscribe(() => { });
    }
    function displayBoard(scoreDisplay, lifeDisplay) {
        mainObservable.subscribe(({ gameStats }) => scoreDisplay.elem.textContent = "Score: " + (1000 * gameStats.asteroidsDestroyed).toString());
        mainObservable.subscribe(({ gameStats }) => lifeDisplay.elem.textContent = "Life: " + (gameStats.startingLives - 1).toString());
    }
    function updateNextRound() {
        mainObservable.filter(({ gameStats }) => gameStats.asteroidsDestroyed >= 7)
            .map(({}) => endDisplay.elem.textContent = "Good Job! You Passed!")
            .map(({}) => scoreDisplay.elem.textContent = scoreDisplay.elem.textContent = "Score: " + (1000 * (gameStats.asteroidsDestroyed)).toString())
            .map(({}) => gameStats.startingLives = 0)
            .subscribe(() => { });
    }
    function findCollisions(asteroidArr, bulletArr) {
        let asteroidIndex = undefined;
        let bulletIndex = undefined;
        for (var i = 0; i < asteroidArr.length; i++) {
            for (var j = 0; j < bulletArr.length; j++) {
                if ((Number(bulletArr[j].attr("cx")) >= Number(asteroidArr[i].attr("cx")) - 20 && Number(bulletArr[j].attr("cx")) <= Number(asteroidArr[i].attr("cx")) + 20) &&
                    (Number(bulletArr[j].attr("cy")) >= Number(asteroidArr[i].attr("cy")) - 20 && Number(bulletArr[j].attr("cy")) <= Number(asteroidArr[i].attr("cy")) + 20)) {
                    asteroidIndex = i;
                    bulletIndex = j;
                    break;
                }
            }
        }
        if (asteroidIndex == undefined || bulletIndex == undefined) {
            return [];
        }
        else {
            return [asteroidIndex, bulletIndex];
        }
    }
}
if (typeof window != 'undefined')
    window.onload = () => {
        asteroids();
    };
//# sourceMappingURL=asteroids.js.map