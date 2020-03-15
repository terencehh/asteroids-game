// FIT2102 2019 Assignment 1
// https://docs.google.com/document/d/1Gr-M6LTU-tfm4yabqZWJYg-zTjEVqHKKTCvePGCYsUA/edit?usp=sharing

function asteroids() {
  // Inside this function you will use the classes and functions
  // defined in svgelement.ts and observable.ts
  // to add visuals to the svg element in asteroids.html, animate them, and make them interactive.
  // Study and complete the Observable tasks in the week 4 tutorial worksheet first to get ideas.

  // You will be marked on your functional programming style
  // as well as the functionality that you implement.
  // Document your code!
  // Explain which ideas you have used ideas from the lectures to
  // create reusable, generic functions.

  // Controls for My game are solely done via the keyboard
  // Left + Right Key : Rotate the ship
  // Up Key : Move Forward
  // Space Key : Shoot projectiles

  // global constant which marks some important states in the game
  const gameStats = {
    startingLives: 4,
    maxLives: 3,
    maxAsteroids: 11,
    currentAsteroids: 0,
    asteroidsDestroyed: 0,
    asteroidArray: [] as Elem[],
    bulletArray: [] as Elem[],
    keyPressed: ""
  };

  const svg = document.getElementById("canvas")!;

  // make a group for the spaceship and a transform to move it and rotate it
  // to animate the spaceship you will update the transform property
  let g = new Elem(svg, "g").attr(
    "transform",
    "translate(300 300) rotate(170)"
  );

  // create a polygon shape for the space ship as a child of the transform group
  let ship = new Elem(svg, "polygon", g.elem)
    .attr("points", "-15,20 15,20 0,-20")
    .attr("style", "fill:lime;stroke:purple;stroke-width:1");

  // create a svg text to display current life
  let lifeDisplay = new Elem(svg, "text")
    .attr("x", 30)
    .attr("y", 80)
    .attr("fill", "#FFFFFF")
    .attr("height", 100)
    .attr("width", 50)
    .attr("font-size", "40px");

  // create a svg text to display current score
  let scoreDisplay = new Elem(svg, "text")
    .attr("x", 200)
    .attr("y", 80)
    .attr("fill", "#FFFFFF")
    .attr("height", 150)
    .attr("width", 50)
    .attr("font-size", "40px");

  // create a svg text to display ending
  let endDisplay = new Elem(svg, "text")
    .attr("x", 150)
    .attr("y", 300)
    .attr("fill", "#FFFFFF")
    .attr("height", 100)
    .attr("width", 50)
    .attr("font-size", "40px");

  // create clock ticker which acts as the main check for the game
  // Inspiration from Tim Dwyer Forum Recommendation + BasicExamples
  const mainInterval = Observable.interval(10).map(() => ({
    gameStats,
    shipValues: /translate\((\d+) (\d+)\) rotate\((\d+)\)/.exec(
      g.attr("transform")
    )
  }));

  // Main observable which runs the game until ending condition is reached
  // All function actions will be performed upon the mainObservable
  const mainObservable = mainInterval.takeUntil(
    mainInterval.filter(
      // game ends when lives is 0 or player reaches certain score
      _ => gameStats.startingLives <= 1 || gameStats.asteroidsDestroyed >= 8
    )
  );

  // Function which handles the observables triggered from keyboard events
  keyInteractions(g, document);

  // Function chain which handles the asteroid behaviors i.e spawning it, animating it, and giving it collision behaviour
  spawnAsteroids(svg).subscribe(asteroid => {
    animateAsteroids(asteroid);
  });

  // Function displaing score values
  displayBoard(scoreDisplay, lifeDisplay);

  // function which handles collisions between asteroids and projectiles
  bulletAsteroidCollision();

  // reinitialize a new round when all asteroids are destroyed
  updateNextRound();

  // final observable which displays game over screen
  Observable.interval(10)
    .map(({}) => ({ gameStats }))
    .filter(({ gameStats }) => gameStats.startingLives == 1)
    .map(({}) => (endDisplay.elem.textContent = "Game Over!"))
    .map(
      ({}) =>
        (scoreDisplay.elem.textContent =
          "Score: " + (1000 * gameStats.asteroidsDestroyed).toString())
    )
    .subscribe(() => {
      lifeDisplay.elem.textContent = "Life: 0";
    });

  // function which handles all the observable keyboard events
  function keyInteractions(g: Elem, document: Document) {
    // press a key have a keypressed value
    // iterate over the keypressed value
    // until keyup, which removes the value

    // store keyDown event to map over
    const keyDown = Observable.fromEvent<KeyboardEvent>(document, "keydown")
      .map(({ code }) => (gameStats.keyPressed = code))
      .map(({}) => ({
        shipValues: /translate\((\d+) (\d+)\) rotate\((\d+)\)/.exec(
          g.attr("transform")
        )
      }))
      .map(({ shipValues }) => ({ shipValues, gameStats }))
      .filter(({ gameStats }) => gameStats.startingLives > 1)
      .subscribe(() => {});

    // remove the keydown event upon keyup
    const keyUp = Observable.fromEvent<KeyboardEvent>(document, "keyup")
      .map(({}) => (gameStats.keyPressed = ""))
      // .forEach(() => console.log("keyup occured!"))
      .filter(({}) => gameStats.startingLives > 1)
      .subscribe(() => {});

    // keyboardObservable.filter(({gameStats}) => gameStats.keyTable)

    // create an observable which maps over the key value continuously until keyup
    const keyboardObservable = mainObservable
      .filter(({ gameStats }) => gameStats.keyPressed.length != 0)
      .filter(({ gameStats }) => gameStats.startingLives > 1);

    // Left key Pressed
    keyboardObservable
      .filter(({ gameStats }) => gameStats.keyPressed == "ArrowLeft")
      .subscribe(({ shipValues }) =>
        g.attr(
          "transform",
          "translate(" +
            shipValues![1] +
            " " +
            shipValues![2] +
            ") rotate(" +
            ((Number(shipValues![3]) - 10) % 360) +
            ")"
        )
      );

    // Right key Pressed
    keyboardObservable
      .filter(({ gameStats }) => gameStats.keyPressed == "ArrowRight")
      .subscribe(({ shipValues }) =>
        g.attr(
          "transform",
          "translate(" +
            shipValues![1] +
            " " +
            shipValues![2] +
            ") rotate(" +
            ((Number(shipValues![3]) + 10) % 360) +
            ")"
        )
      );

    // ensure rotation overlaps when going full circle
    keyboardObservable
      .filter(({ shipValues }) => Number(shipValues![3]) == 0)
      .subscribe(({ shipValues }) =>
        g.attr(
          "transform",
          "translate(" +
            shipValues![1] +
            " " +
            shipValues![2] +
            ") rotate(" +
            "360" +
            ")"
        )
      );

    // Up key Pressed
    // move based on current rotation direction of g ship
    keyboardObservable
      .filter(({ gameStats }) => gameStats.keyPressed == "ArrowUp")
      .map(({ shipValues }) => ({
        x: Math.ceil(
          Math.sin((Number(shipValues![3]) * Math.PI) / 180) * 5 +
            Number(shipValues![1])
        ),
        y: Math.ceil(
          Math.cos((Number(shipValues![3]) * Math.PI) / 180) * -5 +
            Number(shipValues![2])
        ),
        shipValues
      }))
      .subscribe(({ x, y, shipValues }) =>
        g.attr(
          "transform",
          "translate(" + x + " " + y + ") rotate(" + shipValues![3] + ")"
        )
      );

    // ensure ship goes to opposite axis if move to boundary edge
    keyboardObservable
      .filter(({ shipValues }) => Number(shipValues![1]) <= 20)
      .subscribe(({ shipValues }) =>
        g.attr(
          "transform",
          "translate(" +
            "570" +
            " " +
            shipValues![2] +
            ") rotate(" +
            shipValues![3] +
            ")"
        )
      );

    keyboardObservable
      .filter(({ shipValues }) => Number(shipValues![2]) <= 20)
      .subscribe(({ shipValues }) =>
        g.attr(
          "transform",
          "translate(" +
            shipValues![1] +
            " " +
            "570" +
            ") rotate(" +
            shipValues![3] +
            ")"
        )
      );

    keyboardObservable
      .filter(({ shipValues }) => Number(shipValues![1]) >= 580)
      .subscribe(({ shipValues }) =>
        g.attr(
          "transform",
          "translate(" +
            "30" +
            " " +
            shipValues![2] +
            ") rotate(" +
            shipValues![3] +
            ")"
        )
      );

    keyboardObservable
      .filter(({ shipValues }) => Number(shipValues![2]) >= 580)
      .subscribe(({ shipValues }) =>
        g.attr(
          "transform",
          "translate(" +
            shipValues![1] +
            " " +
            "30" +
            ") rotate(" +
            shipValues![3] +
            ")"
        )
      );

    // Space key Pressed
    // ship shoots stuff
    keyboardObservable
      .filter(({ gameStats }) => gameStats.keyPressed == "Space")
      .flatMap(({ shipValues }) => {
        const projectile = new Elem(svg, "circle")
          .attr("cx", Number(shipValues![1]))
          .attr("cy", Number(shipValues![2]))
          .attr("r", 5)
          .attr("fill", "#FFFFFF")
          .attr("collision", "False");

        gameStats.bulletArray.push(projectile);

        // animates the shooting action in an observable
        return mainObservable
          .map(({}) => ({ projectile, shipValues }))
          .takeUntil(Observable.interval(5000));
      })
      // when projectile fires, check if it collides with any asteroids in the asteroidArray
      .map(({ projectile, shipValues }) => ({
        projectile,
        xShift: Math.ceil(
          Math.sin((Number(shipValues![3]) * Math.PI) / 180) * 5 +
            Number(projectile.attr("cx"))
        ),
        yShift: Math.ceil(
          Math.cos((Number(shipValues![3]) * Math.PI) / 180) * -5 +
            Number(projectile.attr("cy"))
        )
      }))
      .filter(({ projectile }) => projectile.attr("collision") == "False")
      .map(({ projectile, xShift, yShift }) =>
        projectile.attr("cx", xShift).attr("cy", yShift)
      )
      .subscribe(() => {});
  }

  // function that creates asteroids randomly in the map
  function spawnAsteroids(svg: HTMLElement): Observable<Elem> {
    // Observable for spawning asteroids until maximum asteroids has been reached
    const spawnAsteroidsObservable = Observable.interval(10)
      .takeUntil(
        mainInterval.filter(
          _ => gameStats.currentAsteroids == gameStats.maxAsteroids + 1
        )
      )
      .map(({}) => ({
        gameStats,
        shipValues: /translate\((\d+) (\d+)\) rotate\((\d+)\)/.exec(
          g.attr("transform")
        )
      }));
    // .filter(({gameStats}) => gameStats.currentAsteroids != gameStats.maxAsteroids + 1 )

    return (
      spawnAsteroidsObservable
        .flatMap(({ gameStats }) => {
          const asteroid = new Elem(svg, "circle").attr("fill", "#000000");

          gameStats.currentAsteroids += 1;
          gameStats.asteroidArray.push(asteroid);

          return spawnAsteroidsObservable.map(({ shipValues, gameStats }) => ({
            shipValues,
            gameStats,
            asteroid
          }));
          // .map(({gameStats}) => gameStats.lives -= 1)
        })

        // map a random starting point for each asteroid,
        // a random rotation value, and a direction that it will go
        // a random size later
        .map(({ asteroid }) =>
          asteroid
            .attr("cx", Math.floor(Math.random() * 100) < 50 ? 100 : 500)
            .attr("cy", Math.floor(Math.random() * 100) < 50 ? 100 : 500)
            .attr("r", 20)
            .attr("fill", "#808080")
            .attr("rotation", Math.floor(Math.random() * 360).toString())
            .attr("direction", Math.random() < 0.5 ? -2 : 2)
            .attr("removedState", "False")
        )
    );
  }

  // function that animates asteroid Elem passed to it
  function animateAsteroids(asteroid: Elem) {
    // Observable for animating asteroids
    const animateAsteroidsObservable = Observable.interval(100)
      .map(({}) => ({
        shipValues: /translate\((\d+) (\d+)\) rotate\((\d+)\)/.exec(
          g.attr("transform")
        ),
        gameStats,
        asteroid
      }))
      .filter(({ gameStats }) => gameStats.startingLives > 1)
      // take until collision with ship
      .takeUntil(
        Observable.interval(10)
          .map(({}) => ({ asteroid }))
          .filter(({ asteroid }) => asteroid.attr("removedState") == "True")
      );

    // handle collision with ship
    // once collide - the asteroid is removed from canvas
    // and ship life is decreased by 1
    // assume asteroid is destroyed when collide with ship, hence increase score
    animateAsteroidsObservable
      .filter(
        ({ shipValues, asteroid }) =>
          Number(shipValues![1]) >= Number(asteroid.attr("cx")) - 20 &&
          Number(shipValues![1]) <= Number(asteroid.attr("cx")) + 20 &&
          Number(shipValues![2]) >= Number(asteroid.attr("cy")) - 20 &&
          Number(shipValues![2]) <= Number(asteroid.attr("cy")) + 20
      )
      //.forEach(({shipValues, asteroid}) => console.log("Ship X: ", shipValues![1] + " Clash with Asteroid X: " + asteroid.attr("cx")))
      .map(({ asteroid }) =>
        asteroid
          .attr("removedState", "True")
          .attr("cx", -1000)
          .attr("cy", -1000)
          .elem.remove()
      )
      .map(() => (gameStats.startingLives -= 1))
      .map(() => (gameStats.asteroidsDestroyed += 1))
      .subscribe(() => {});

    // subscribe asteroid to opposite x axis when reach boundary of x
    animateAsteroidsObservable
      .filter(({ asteroid }) => asteroid.attr("removedState") == "False")
      .filter(({ asteroid }) => Number(asteroid.attr("cx")) >= 580)
      .subscribe(({ asteroid }) =>
        asteroid
          .attr(
            "cx",
            Math.ceil(
              Math.sin((Number(asteroid.attr("rotation")) * Math.PI) / 180) *
                Number(asteroid.attr("direction")) +
                20
            )
          )
          .attr(
            "cy",
            Math.ceil(
              Math.cos((Number(asteroid.attr("rotation")) * Math.PI) / 180) *
                Number(asteroid.attr("direction")) +
                Number(asteroid.attr("cy"))
            )
          )
      );

    // subscribe asteroid to opposite x axis when reach boundary of x
    animateAsteroidsObservable
      .filter(({ asteroid }) => asteroid.attr("removedState") == "False")
      .filter(({ asteroid }) => Number(asteroid.attr("cx")) <= 20)
      .subscribe(({ asteroid }) =>
        asteroid
          .attr(
            "cx",
            Math.ceil(
              Math.sin((Number(asteroid.attr("rotation")) * Math.PI) / 180) *
                Number(asteroid.attr("direction")) +
                580
            )
          )
          .attr(
            "cy",
            Math.ceil(
              Math.cos((Number(asteroid.attr("rotation")) * Math.PI) / 180) *
                Number(asteroid.attr("direction")) +
                Number(asteroid.attr("cy"))
            )
          )
      );

    // subscribe asteroid to opposite y axis when reach boundary of y
    animateAsteroidsObservable
      .filter(({ asteroid }) => asteroid.attr("removedState") == "False")
      .filter(({ asteroid }) => Number(asteroid.attr("cy")) >= 580)
      .subscribe(({ asteroid }) =>
        asteroid
          .attr(
            "cx",
            Math.ceil(
              Math.sin((Number(asteroid.attr("rotation")) * Math.PI) / 180) *
                Number(asteroid.attr("direction")) +
                Number(asteroid.attr("cx"))
            )
          )
          .attr(
            "cy",
            Math.ceil(
              Math.cos((Number(asteroid.attr("rotation")) * Math.PI) / 180) *
                Number(asteroid.attr("direction")) +
                20
            )
          )
      );

    // subscribe asteroid to opposite x axis when reach boundary of y
    animateAsteroidsObservable
      .filter(({ asteroid }) => asteroid.attr("removedState") == "False")
      .filter(({ asteroid }) => Number(asteroid.attr("cy")) <= 20)
      .subscribe(({ asteroid }) =>
        asteroid
          .attr(
            "cx",
            Math.ceil(
              Math.sin((Number(asteroid.attr("rotation")) * Math.PI) / 180) *
                Number(asteroid.attr("direction")) +
                Number(asteroid.attr("cx"))
            )
          )
          .attr(
            "cy",
            Math.ceil(
              Math.cos((Number(asteroid.attr("rotation")) * Math.PI) / 180) *
                Number(asteroid.attr("direction")) +
                580
            )
          )
      );

    // subscribe asteroid to usual movement based on its rotation and direction
    animateAsteroidsObservable
      .filter(({ asteroid }) => asteroid.attr("removedState") == "False")
      .subscribe(({ asteroid }) =>
        asteroid
          .attr(
            "cx",
            Math.floor(
              Math.sin((Number(asteroid.attr("rotation")) * Math.PI) / 180) *
                Number(asteroid.attr("direction")) +
                Number(asteroid.attr("cx"))
            )
          )
          .attr(
            "cy",
            Math.floor(
              Math.cos((Number(asteroid.attr("rotation")) * Math.PI) / 180) *
                Number(asteroid.attr("direction")) +
                Number(asteroid.attr("cy"))
            )
          )
      );
  }

  // function which handles collisions between asteroids and projectiles
  function bulletAsteroidCollision() {
    // Check collision between projectile and asteroids
    // compare bullet and asteroid array
    // upon detect collision, remove the bullet and asteroid in their respective place and increase asteroid destroyed
    mainObservable
      .map(({ gameStats }) =>
        findCollisions(gameStats.asteroidArray, gameStats.bulletArray)
      )
      .filter(collisionList => collisionList.length > 0)
      .forEach(collisionList =>
        gameStats.asteroidArray[collisionList[0]]
          .attr("cx", -2000)
          .attr("cy", -2000)
          .attr("collision", "True")
          .elem.remove()
      )
      .forEach(collisionList =>
        gameStats.bulletArray[collisionList[1]]
          .attr("cx", -1000)
          .attr("cy", -1000)
          .attr("removedState", "True")
          .elem.remove()
      )
      .forEach(collisionList =>
        gameStats.asteroidArray.splice(collisionList[0], 1)
      )
      .forEach(collisionList =>
        gameStats.bulletArray.splice(collisionList[1], 1)
      )
      .map(() => (gameStats.asteroidsDestroyed += 1))
      .subscribe(() => {});
  }

  // function which displays the score and life values on the svg canvas
  function displayBoard(scoreDisplay: Elem, lifeDisplay: Elem) {
    // Observable for updating values on screen
    mainObservable.subscribe(
      ({ gameStats }) =>
        (scoreDisplay.elem.textContent =
          "Score: " + (1000 * gameStats.asteroidsDestroyed).toString())
    );
    mainObservable.subscribe(
      ({ gameStats }) =>
        (lifeDisplay.elem.textContent =
          "Life: " + (gameStats.startingLives - 1).toString())
    );
  }

  // function which displays values when game is over
  function updateNextRound() {
    mainObservable
      .filter(({ gameStats }) => gameStats.asteroidsDestroyed >= 5)
      .map(({}) => (endDisplay.elem.textContent = "Good Job! You Passed!"))
      .map(
        ({}) =>
          (scoreDisplay.elem.textContent = scoreDisplay.elem.textContent =
            "Score: " + (1000 * gameStats.asteroidsDestroyed).toString())
      )
      .map(({}) => (gameStats.startingLives = 0))
      .subscribe(() => {});
    // reset game variables but score
    // .map(({}) => gameStats.asteroidArray.splice(0,gameStats.asteroidArray.length))
    // .map(({}) => gameStats.bulletArray.splice(0,gameStats.bulletArray.length))
    // .map(({}) => gameStats.roundAsteroidDestroyed = 0)
    // .map(({}) => gameStats.currentAsteroids = 0)
    // .map(({}) => endDisplay.elem.textContent = "")
    // .map(() => {spawnAsteroids(svg).subscribe(asteroid => animateAsteroids(asteroid))})
    // .subscribe(() => {})
  }

  // impure function which returns a list pair of asteroid/bullet elements that have collided
  function findCollisions(asteroidArr: Elem[], bulletArr: Elem[]) {
    // console.log("Asteroid Array: ", asteroidArr)
    // console.log("Bullet Array: ", bulletArr)

    // console.log("Collided Array", asteroidArr.map(asteroid => bulletArr.filter(bullet =>
    //   (Number(bullet.attr("cx")) >= Number(asteroid.attr("cx")) - 20 && Number(bullet.attr("cx")) <= Number(asteroid.attr("cx")) + 20) &&
    //   (Number(bullet.attr("cy")) >= Number(asteroid.attr("cy")) - 20 && Number(bullet.attr("cy")) <= Number(asteroid.attr("cy")) + 20))))

    let asteroidIndex = undefined;
    let bulletIndex = undefined;
    for (var i = 0; i < asteroidArr.length; i++) {
      for (var j = 0; j < bulletArr.length; j++) {
        // if the position of asteroid and bullet match, then return it
        if (
          Number(bulletArr[j].attr("cx")) >=
            Number(asteroidArr[i].attr("cx")) - 20 &&
          Number(bulletArr[j].attr("cx")) <=
            Number(asteroidArr[i].attr("cx")) + 20 &&
          Number(bulletArr[j].attr("cy")) >=
            Number(asteroidArr[i].attr("cy")) - 20 &&
          Number(bulletArr[j].attr("cy")) <=
            Number(asteroidArr[i].attr("cy")) + 20
        ) {
          asteroidIndex = i;
          bulletIndex = j;
          break;
        }
      }
    }
    if (asteroidIndex == undefined || bulletIndex == undefined) {
      return [];
    } else {
      return [asteroidIndex, bulletIndex];
    }

    // return asteroidArr.filter(asteroid => bulletArr.filter(bullet =>
    //         (Number(bullet.attr("cx")) >= Number(asteroid.attr("cx")) - 20 && Number(bullet.attr("cx")) <= Number(asteroid.attr("cx")) + 20) &&
    //         (Number(bullet.attr("cy")) >= Number(asteroid.attr("cy")) - 20 && Number(bullet.attr("cy")) <= Number(asteroid.attr("cy")) + 20))
    //         .length > 0)

    // (bulletArr.map((bullet) =>  ).length  )

    // (mainInterval.filter(
    //   // animate the bullet until it has collided with an asteroid
    //   _ => gameStats.asteroidArray.filter((asteroid) =>
    //    (Number(projectile.attr("cx")) >= Number(asteroid.attr("cx")) - 20 && Number(projectile.attr("cx")) <= Number(asteroid.attr("cx")) + 20) &&
    //    (Number(projectile.attr("cy")) >= Number(asteroid.attr("cy")) - 20 && Number(projectile.attr("cy")) <= Number(asteroid.attr("cy")) + 20))
    //    .length != 0))
  }
}

// the following simply runs your asteroids function on window load.  Make sure to leave it in place.
if (typeof window != "undefined")
  window.onload = () => {
    asteroids();
  };
