import './App.css'

import { useEffect, useState } from 'react'
import {
  FaceLandmarker,
  FaceLandmarkerOptions,
  FilesetResolver,
} from '@mediapipe/tasks-vision'
import { Color, Euler, Matrix4 } from 'three'
import { Canvas, useFrame, useGraph } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'

let video: HTMLVideoElement
let faceLandmarker: FaceLandmarker
let lastVideoTime = -1
let blendshapes: any[] = []
let rotation: Euler
let headMesh: any[] = []

const options: FaceLandmarkerOptions = {
  baseOptions: {
    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
    delegate: 'GPU',
  },
  numFaces: 1,
  runningMode: 'VIDEO',
  outputFaceBlendshapes: true,
  outputFacialTransformationMatrixes: true,
}

function Avatar({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  const { nodes } = useGraph(scene)

  useEffect(() => {
    if (nodes.Wolf3D_Head) headMesh.push(nodes.Wolf3D_Head)
    if (nodes.Wolf3D_Teeth) headMesh.push(nodes.Wolf3D_Teeth)
    if (nodes.Wolf3D_Tongue) headMesh.push(nodes.Wolf3D_Tongue)
    if (nodes.Wolf3D_Beard) headMesh.push(nodes.Wolf3D_Beard)
    if (nodes.Wolf3D_Avatar) headMesh.push(nodes.Wolf3D_Avatar)
    if (nodes.Wolf3D_Head_Custom) headMesh.push(nodes.Wolf3D_Head_Custom)
  }, [nodes, url])

  useFrame(() => {
    if (blendshapes.length > 0) {
      blendshapes.forEach((element) => {
        headMesh.forEach((mesh) => {
          let index = mesh.morphTargetDictionary[element.categoryName]
          if (index >= 0) {
            mesh.morphTargetInfluences[index] = element.score
          }
        })
      })

      nodes.Head.rotation.set(rotation.x / 3, rotation.y / 3, rotation.z / 3)
      nodes.Neck.rotation.set(
        rotation.x / 5 + 0.3,
        rotation.y / 5,
        rotation.z / 5,
      )
      nodes.Spine2.rotation.set(
        rotation.x / 10,
        rotation.y / 10,
        rotation.z / 10,
      )
    }
  })

  return <primitive object={scene} position={[0, -1.75, 3]} />
}

function App() {
  const [url, setUrl] = useState<string>('')

  const setup = async () => {
    const filesetResolver = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm',
    )
    faceLandmarker = await FaceLandmarker.createFromOptions(
      filesetResolver,
      options,
    )

    video = document.getElementById('video') as HTMLVideoElement
    navigator.mediaDevices
      .getUserMedia({
        video: { width: 1280, height: 720 },
        audio: false,
      })
      .then(function (stream) {
        video.srcObject = stream
        video.addEventListener('loadeddata', predict)
      })
  }

  const predict = async () => {
    let nowInMs = Date.now()
    if (lastVideoTime !== video.currentTime) {
      lastVideoTime = video.currentTime
      const faceLandmarkerResult = faceLandmarker.detectForVideo(video, nowInMs)

      if (
        faceLandmarkerResult.faceBlendshapes &&
        faceLandmarkerResult.faceBlendshapes.length > 0 &&
        faceLandmarkerResult.faceBlendshapes[0].categories
      ) {
        blendshapes = faceLandmarkerResult.faceBlendshapes[0].categories

        const matrix = new Matrix4().fromArray(
          faceLandmarkerResult.facialTransformationMatrixes![0].data,
        )
        rotation = new Euler().setFromRotationMatrix(matrix)
      }
    }

    window.requestAnimationFrame(predict)
  }

  const handleGenderChange = async (selectedGender: string) => {
    setUrl(
      selectedGender === 'man'
        ? 'https://models.readyplayer.me/65693313e0834c9ab388b0fc.glb?morphTargets=ARKit&textureAtlas=1024'
        : 'https://models.readyplayer.me/656929d8e0834c9ab38892b1.glb?morphTargets=ARKit&textureAtlas=1024',
    )
  }

  const handleGenderChangeEvent = () => {
    // Add your logic here to determine the default URL based on some conditions.
    // For example, you can return a default URL for 'man' or 'woman'.
    // Update the logic based on your requirements.
    return '65693313e0834c9ab388b0fc.glb'
  }

  useEffect(() => {
    // Set the initial URL when the component mounts
    setUrl(handleGenderChangeEvent())
    setup()
  }, [])

  return (
    <div className="App">
      <label>
        Select Gender:
        <select onChange={(e) => handleGenderChange(e.target.value)}>
          <option value="man">Man</option>
          <option value="woman">Woman</option>
        </select>
      </label>
      <video className="camera-feed" id="video" autoPlay></video>
      <Canvas style={{ height: 600 }} camera={{ fov: 25 }} shadows>
        <ambientLight intensity={0.5} />
        <pointLight
          position={[10, 10, 10]}
          color={new Color(1, 1, 0)}
          intensity={0.5}
          castShadow
        />
        <pointLight
          position={[-10, 0, 10]}
          color={new Color(1, 0, 0)}
          intensity={0.5}
          castShadow
        />
        <pointLight position={[0, 0, 10]} intensity={0.5} castShadow />
        <Avatar url={url} />
      </Canvas>
    </div>
  )
}

export default App
