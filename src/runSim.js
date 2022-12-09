
import * as THREE from 'three';
import {drawTheta, drawVelocity} from "./makeGraphs.js";
import {updateVals, getGraphData} from "./rk4functions.js";
import * as d3 from "https://esm.run/d3"; 

export const context = {runloop: false};
export let nextFrameStatic = null;
export let nextFrameVariable = null;



export function draw(equations, useEval, thetaDivId, velocityDivId, ) {
    //TODO:
    //X and Y axis get bigger as x and y go out of bounds

    //Cancels the previous animation render loop of either the static or variable equation draw
    if (useEval){
        if (nextFrameVariable != null) cancelAnimationFrame(nextFrameVariable);
        
    } else{
        if (nextFrameStatic != null) cancelAnimationFrame(nextFrameStatic);
        }
    
  // picks the correct canvas based on if drawing inputed eqn or not
  let canvas;
  if (useEval){
    canvas = document.querySelector('#c');
    } else {
    canvas = document.querySelector('#c2'); 
    }


  //create camera and renderer
  const renderer = new THREE.WebGLRenderer({canvas});
  renderer.setClearColor( 0xffffff, 0);
  const viewSize = canvas.clientWidth;
  const aspectRatio = canvas.clientWidth/canvas.clientHeight;
  const near = 0.1;
  const far = 1000;
  const camera = new THREE.PerspectiveCamera(25,aspectRatio,near,far);
  //const camera = new THREE.OrthographicCamera(-aspectRatio*viewSize/2,aspectRatio*viewSize/2, viewSize/2,-viewSize/2,near,far)
  camera.position.z = 500;
  const scene = new THREE.Scene();

  //get vals from page
  let radius = Number(document.getElementById("radius").value);
  let tube = 3;
  let radialSegments = 16; 
  let tubularSegments = 81;
  let arc = 2*Math.PI;
  let omega = Number(document.getElementById("omega").value);
  let g = Number(document.getElementById("gravity").value);
  let k  = Number(document.getElementById("friction").value); // Ask about what time constant should do
  let angle =  Number(document.getElementById("theta").value)*Math.PI/180;
  let velocity = Number(document.getElementById("velocity").value);
  let simSpeed = Number(document.getElementById("simSpeed").value);
  let graphUpdateInterval = Number(document.getElementById("graphint").value);
  let graphLen = Number(document.getElementById("graphlen").value);
  const trailLen = Number(document.getElementById("trailLen").value);
  let project = document.getElementById("projection").checked;



  const geometryHoop = new THREE.TorusGeometry(100,tube,radialSegments,tubularSegments, arc);
  const materialHoop = new THREE.MeshBasicMaterial({color: 0x44aa88}); 
  const geometryHoop2 = new THREE.TorusGeometry(100,tube*1.05,radialSegments,tubularSegments, arc/2);
  const hoop = new THREE.Mesh(geometryHoop, materialHoop);
  scene.add(hoop);
  const geometryCenter = new THREE.SphereGeometry( 2, 32, 16 );
  const materialCenter = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
  const center = new THREE.Mesh( geometryCenter, materialCenter );
  scene.add( center );
  const geometryBall = new THREE.SphereGeometry( 5, 5,5 );
  const materialBall = new THREE.MeshBasicMaterial( { color: 0xff0000} );
  const ball = new THREE.Mesh( geometryBall, materialBall );
  scene.add( ball );
  const lineMaterial = new THREE.LineBasicMaterial({color: "red", linewidth: 3});
  const points = [];
  points.push( new THREE.Vector3( 0, 120, 0 ) );
  points.push( new THREE.Vector3( 0, 0, 0 ) );
  points.push( new THREE.Vector3( 0, -120, 0 ) );
  var tubeGeometry = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points),
    512,
    1,
    8, 
    false 
  );
  const line = new THREE.Line( tubeGeometry, lineMaterial );
  scene.add(line);



  //sets up for the ball trail
  let balls = [];
  let ballsCords = [];
  for (let i = 0; i < trailLen; i++) {
    balls.push(new THREE.Mesh( new THREE.SphereGeometry( i/trailLen*5, 5,5 ), new THREE.MeshBasicMaterial( { color: 0xff0000, transparent: true, opacity: 0+i/trailLen} )));
    ballsCords.push(0);
  }
  balls.forEach(e=>scene.add(e));
  let prevCords = []; 
  prevCords.length = trailLen; prevCords.fill(0);

  //let funcID = Math.random(); // use this if need to check to see which function is doing what or if the function isnt correctly being canceled
  let thetaGraph;
  let velocityGraph;

  //gets data for graph for d3 graphs and then graphs them for the correct simulation
  let graphData = getGraphData(graphUpdateInterval, velocity, angle, omega, radius, g, k, equations, useEval, graphLen);
  if (thetaDivId === "variableSim-theta"){
  thetaGraph = drawTheta(graphData, graphLen, thetaDivId, "inputed", [0,0]);
  velocityGraph = drawVelocity(graphData, graphLen, velocityDivId, "inputed", [0,0]);
} else{
  thetaGraph = drawTheta(graphData, graphLen, thetaDivId, "actual", [0,0]);
  velocityGraph = drawVelocity(graphData, graphLen, velocityDivId, "actual", [0,0]);

}
  
  let timer = 0;
  let lastTime = 0;
  let firstIteration = true;
  let timerThreshold = false;

  renderer.render(scene, camera);
  function render(time){ // find delta t between animations and plug in as h in rk4

    if (window.play && (window.RunTest || !useEval)){
      
    
    //console.log(funcID);
    if (firstIteration){
      lastTime = time;
      firstIteration = false;
    }

    //hoop rotation, grab new data from rk4, adjust angle to whithin 0-6.28 rads
    let dt = ((time - lastTime) * simSpeed/ 1000);
    timer += dt;
    lastTime = time;
    let data = updateVals(dt, velocity, angle, omega, radius, g, k, equations, useEval);
    angle = data[0];
    // angle = angle%(2*Math.PI);
    // if (angle < 0){
    //   angle = 2*Math.PI - Math.abs(angle)
    // }
    velocity = data[1];
    hoop.rotation.y += omega*dt;
    
    if(timer < graphLen){
      let dataIndex = (timer/graphUpdateInterval).toFixed(0);
      let ballAngle = graphData[dataIndex][1];
      let ballVelocity = graphData[dataIndex][2];
      updateBallGraph(timer, ballAngle, ballVelocity, graphLen, thetaGraph, velocityGraph, graphData);
    }else if (!timerThreshold){
      graphLen = timer; //append data to graph data here
      graphData.push([timer, angle, velocity])
      console.log(graphData.length)
      if (thetaDivId === "variableSim-theta"){
        document.getElementById("variableSim-theta").innerHTML = "";
        document.getElementById("variableSim-velocity").innerHTML = "";
        thetaGraph = drawTheta(graphData, graphLen, thetaDivId, "inputed");
        velocityGraph = drawVelocity(graphData, graphLen, velocityDivId, "inputed");
      } else{
        document.getElementById("staticSim-theta").innerHTML = "";
        document.getElementById("staticSim-velocity").innerHTML = "";
        thetaGraph = drawTheta(graphData, graphLen, thetaDivId, "actual");
        velocityGraph = drawVelocity(graphData, graphLen, velocityDivId, "actual");
      }
      updateBallGraph(timer, angle, velocity, graphLen, thetaGraph, velocityGraph, graphData);
    }
    

    //takes care of ball trail, and whether or not its projected on the hoop
    if (project){
      ballsCords.push(angle);
      ballsCords.shift();
    }
    let cords = getBallPos(angle+3*Math.PI/2, 100);
    let xyz = {x:cords[0]*Math.cos(hoop.rotation.y), y: cords[1], z: -cords[0]*Math.sin(hoop.rotation.y)};
    ball.position.set(xyz.x,xyz.y,xyz.z);
    prevCords.push([xyz.x,xyz.y,xyz.z]);
    prevCords.shift();
    for (let i = 0; i < trailLen; i++) {
      if (prevCords[i] != 0){
        if (project){
          let tempCord = getBallPos(ballsCords[i]+3*Math.PI/2, 100);
          balls[i].position.set(tempCord[0]*Math.cos(hoop.rotation.y),  tempCord[1],  -tempCord[0]*Math.sin(hoop.rotation.y))
        } else {
      balls[i].position.set(prevCords[i][0],prevCords[i][1],prevCords[i][2])
      }
    }
    }
    
    //update time on page
    document.getElementById("time").innerHTML = timer.toFixed(3);
  } else {
    lastTime = time;
  }
    renderer.render(scene,camera);


    if (useEval){ //theres keep track of the animation frameloop for each simulation so it can be cancelled incase of regeneration
        nextFrameVariable = requestAnimationFrame(render);
    } else{
        nextFrameStatic = requestAnimationFrame(render);
        }
    
  }
  if (useEval){
    nextFrameVariable = requestAnimationFrame(render);
} else{
    nextFrameStatic = requestAnimationFrame(render);
    }
  
}

function getBallPos(angle,radius){
  let x = radius*Math.cos(angle);
  let y = radius*Math.sin(angle);
return [x,y];
}

function updateBallGraph(timer, angle, velocity, graphLen, thetaGraph, velocityGraph, graphData){
  if (!(timer == null) && !(angle == null)) {
    const x = d3.scaleLinear()
      .domain([0,graphLen])
      .range([ 0, 210]);

      const minYT = d3.min(graphData, (d) => d[1])
      const maxYT = d3.max(graphData, (d) => d[1])
      const minYV = d3.min(graphData, (d) => d[2])
      const maxYV = d3.max(graphData, (d) => d[2])
      const y = d3.scaleLinear()
      .domain([maxYT, minYT])
      .range([ 0, 260 ]);

      const yV = d3.scaleLinear()
      .domain([maxYV, minYV])
      .range([ 0, 260 ]);


    thetaGraph.selectAll("circle").remove();
    thetaGraph.selectAll("dot")
      .data([50,50])
      .enter().append("circle")
        .attr("r", 3.5)
        .attr("cx", x(timer))
        .attr("cy", y(angle))
        .attr("fill", "red")
        .attr("stroke", "red")

    velocityGraph.selectAll("circle").remove();
    velocityGraph.selectAll("dot")
      .data([50,50])
      .enter().append("circle")
        .attr("r", 3.5)
        .attr("cx", x(timer))
        .attr("cy", yV(velocity))
        .attr("fill", "red")
        .attr("stroke", "red")
    }
}
