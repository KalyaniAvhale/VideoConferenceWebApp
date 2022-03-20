const APP_ID = '1ef2db917fad45528ea02901ecda38ee'
const CHANNEL = sessionStorage.getItem('room')
const TOKEN =  sessionStorage.getItem('token')
let UID = Number(sessionStorage.getItem('UID'))
let NAME = sessionStorage.getItem('name')

console.log('Stream.js connected')

const client = AgoraRTC.createClient({mode:'rtc', codec:'vp8'})


var localTracks = {
    screenVideoTrack: null,
    audioTrack: null,
    screenAudioTrack: null
}
let remoteUsers = {}
let sharingScreen = false
let rtcUid = UID 

let joinAndDisplayLocalStream = async() => {
    document.getElementById('room-name').innerText = CHANNEL

    client.on('user-published', handleUserJoined)
    client.on('user-left', handleUserleft)

    try{
        UID = await client.join(APP_ID, CHANNEL, TOKEN, UID)
    }
    catch(error){
        console.error(error)
        window.open('/','_self')
    }

    //create local track 
    localTracks = await AgoraRTC.createMicrophoneAndCameraTracks()
    
    let member = await createMember()

    let player = `<div  class="video-container" id="user-container-${UID}">
                        <div class="video-player" id="user-${UID}"></div>
                        <div class="username-wrapper"><span class="user-name">${member.name}</span></div>
                    </div>`
    document.getElementById('video-streams').insertAdjacentHTML('beforeend', player)
    
    localTracks[1].play(`user-${UID}`)

    await client.publish([localTracks[0], localTracks[1]])
}


//handle multiple user joined
let handleUserJoined = async(user, mediaType) => {
    remoteUsers[user.uid] = user
    await client.subscribe(user, mediaType)

    if(mediaType === 'video'){
        let player = document.getElementById(`user-container-${user.uid}`)
        if(player != null){
            player.remove()
        }

        let member = await getMember(user)

        player = `<div  class="video-container" id="user-container-${user.uid}">
                        <div class="video-player" id="user-${user.uid}"></div>
                        <div class="username-wrapper"><span class="user-name">${member.name}</span></div>
                    </div>`
        
        
        document.getElementById('video-streams').insertAdjacentHTML('beforeend', player)
        user.videoTrack.play(`user-${user.uid}`)

    }
    
    if(mediaType === 'audio'){
        user.audioTrack.play()
    }
}


//leave call when window closed
let handleUserleft = async(user) => {
    delete remoteUsers[user.uid]
    document.getElementById(`user-container-${user.uid}`).remove()
}

//leave room using exit button
let leaveAndRemoveLocalStream = async() =>{
    for (let i=0; localTracks.length >i; i++){
        localTracks[i].stop()
        localTracks[i].close()
    }

    await client.leave()
    deleteMember()
    window.open('/lobby','_self')
}

//toggle camera
let toggleCamera = async(e) =>{
    
    if(localTracks[1].muted){
        await localTracks[1].setMuted(false)
        e.target.style.backgroundColor = '#fff'
    }
    else{
        await localTracks[1].setMuted(true)
        e.target.style.backgroundColor = 'rgb(255, 80, 80, 1)'
    }

}

//toggle microphone
let toggleMic = async(e) =>{
    if(localTracks[0].muted){
        await localTracks[0].setMuted(false)
        e.target.style.backgroundColor = '#fff'
    }
    else{
        await localTracks[0].setMuted(true)
        e.target.style.backgroundColor = 'rgb(255, 80, 80, 1)'
    }

}


function AutoRefresh( t ) {
    setTimeout("location.reload(true);", t);
 }

//toggle videoshare
let togglevideoshare = async (e) => {
    AutoRefresh(5)
    client.setClientRole('host')
    localTracks = await AgoraRTC.createMicrophoneAndCameraTracks()
    document.getElementById('video-streams').innerHTML=''
    
        let player = document.getElementById(`user-container-${rtcUid}`)
        if (player != null){
            player.remove()
        }

        player = `<div  class="video-container" id="user-container-${rtcUid}">
            <div class="video-player" id="user-${rtcUid}"></div>
        </div>`

        document.getElementById('video-streams').insertAdjacentHTML('beforeend', player)
        localTracks[1].play(`user-${rtcUid}`) 
        await client.publish([localTracks[0], localTracks[1]])
        AutoRefresh(5)
    }    


let togglesharescreen = async (e) => {
    console.log("Screen share clicked...")
    if(sharingScreen){
        togglevideoshare()
        sharingScreen = false
        await client.unpublish([localScreenTracks])
        AutoRefresh(5)

    }else{
        sharingScreen = true
        localScreenTracks = await 
        AgoraRTC.createScreenVideoTrack({
                // Set the encoder configurations. For details, see the API description.
                encoderConfig: "1080p_1",
                // Set the video transmission optimization mode as prioritizing video quality.
                optimizationMode: "detail"
            },);
     
        let player = document.getElementById(`user-container-${rtcUid}`)

        if (player != null){
            player.remove()
        }

        player = `<div  class="video-container" id="user-container-${rtcUid}">
            <div class="video-player" id="user-${rtcUid}"></div>
        </div>`

        document.getElementById('video-streams').insertAdjacentHTML('beforeend', player)
        localScreenTracks.play(`user-${rtcUid}`) 
        await client.unpublish([localTracks[0], localTracks[1]])
        await client.publish([ localScreenTracks])
        
        //document.getElementById('sharescreen-btn').innerHTML= 
        e.target.style.backgroundColor = 'rgb(255, 80, 80, 1)'
        
    }    
}



let createMember = async() =>{
    let response = await fetch('/create_member/',{
        method:'POST',
        headers:{
            'Content-Type':'application/json',

        },
        body:JSON.stringify({'name':NAME, 'room_name':CHANNEL, 'UID':UID})
    })
    let member = await response.json()
    return member
}

let getMember = async (user) => {
    let response = await fetch(`/get_member/?UID=${user.uid}&room_name=${CHANNEL}`)
    let member = await response.json()
    return member
}

let deleteMember = async () => {
    let response = await fetch('/delete_member/', {
        method:'POST',
        headers: {
            'Content-Type':'application/json'
        },
        body:JSON.stringify({'name':NAME, 'room_name':CHANNEL, 'UID':UID})
    })
    let member = await response.json()
}
window.addEventListener("beforeunload",deleteMember)



joinAndDisplayLocalStream()

document.getElementById('leave-btn').addEventListener('click',leaveAndRemoveLocalStream)
document.getElementById('camera-btn').addEventListener('click',toggleCamera)
document.getElementById('mic-btn').addEventListener('click',toggleMic)
document.getElementById('sharescreen-btn').addEventListener('click', togglesharescreen)