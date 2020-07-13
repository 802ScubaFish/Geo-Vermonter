import React from 'react';
import './App.css';
import { Map, TileLayer, Polygon } from 'react-leaflet';
import borderData from './border.js';
import L from 'leaflet'
import leafletPip from 'leaflet-pip'
let defaultPos = [44.0886, -72.7317]
let defaultZoom = 7


class VTMap extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            latitude: '',
            longitude: '',
            county: '',
            town: '',
            status: 'Game Started, Awaiting your first guess..',
            guess: '',
            modalDisplayed: false,
            points: 100,
        }
    }

    // itterate over indexs [0]  and [1] in each array in the list of arrays and return the highest of each value
    getCorners = () => {

        let maxLon = -73.35218
        let minLon = -71.510225

        let maxLat = 45.005419
        let minLat = 42.730315
        return (
            [minLat, maxLat, minLon, maxLon]
        )
    }

    getRndInteger = (min, max) => {
        return Math.floor(Math.random() * (max - min)) + min;
    }

    randPoint = (array) => {
        let randoLon = this.getRndInteger(array[0], array[1])

        let randoLat = this.getRndInteger(array[2], array[3])

        return (
            [randoLon, randoLat]

        )
    }

    // Logic to check if the randomly chosen point is within the VTBorder
    checkValidPoint = (layer, rect, pin) => {
        if (layer.length) {
            console.log(`Correct length, returning pin: ${pin}`)
            return pin
        }
        else {
            console.log("Invalid point...")
            let newPin = this.randPoint(rect)
            let newLayer = (leafletPip.pointInLayer([newPin[1], newPin[0]], L.geoJSON(borderData)))
            return this.checkValidPoint(newLayer, rect, newPin)
        }
    }

    clickHandlerStart = (evt) => {
        evt.preventDefault();

        this.setState({
            playing: true
        })
        // let myMap = document.getElementById('mainMap')

        let corners = this.getCorners(borderData)

        let pinDraft = this.randPoint(corners) //this is the point on the map we are going to check

        let geoJsonData = L.geoJSON(borderData)

        let layerDraft = (leafletPip.pointInLayer([pinDraft[0], pinDraft[1]], geoJsonData))

        let validPoint = this.checkValidPoint(layerDraft, corners, pinDraft)

        console.log(`This is the valid point: ${validPoint}`)
        defaultPos = validPoint
        defaultZoom = 18

        // when the 'Valid Point' is chosen, the game will reset state to add the ?'s to the info panel
        this.setState({
            latitude: '?',
            longitude: '?',
            county: '?',
            town: '?',
        })

        // pulling the county/lat/town/village(not county according to Postman?) --  --All Info stored in variable 'townData'
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${validPoint[0]}&lon=${validPoint[1]}&format=geojson`)
            .then((res) => res.json())
            .then((obj) => {
                console.log(obj)
                this.setState({
                    townData: {
                        latitude: validPoint[0],
                        longitude: validPoint[1],
                        county: obj.features[0].properties.address.county,
                        town: obj.features[0].properties.address.village || obj.features[0].properties.address.hamlet || obj.features[0].properties.address.town || obj.features[0].properties.address.city
                    }
                })
            })
    }

    // Handles guess button and then displays current location data + makes the start button available again
    giveUpHandler = (evt) => {
        evt.preventDefault();

        if (evt.target.textContent === 'Give Up') {
            let latVar = this.state.townData.latitude
            let lonVar = this.state.townData.longitude
            let countyVar = this.state.townData.county
            let townVar = this.state.townData.town

            this.setState({
                latitude: latVar,
                longitude: lonVar,
                county: countyVar,
                town: townVar,
                playing: false
            });
        }

    }

    // This section handles the guess button modal. y
    guessButtonHandler = (evt) => {
        evt.preventDefault();
        let check = evt.target.innerHTML + 'County'
        if (check === this.state.townData.county) {
            // console.log(`${check} is equal to ${this.state.townData.county}`)
            let latVar = this.state.townData.latitude
            let lonVar = this.state.townData.longitude
            let countyVar = this.state.townData.county
            let townVar = this.state.townData.town
            this.setState({
                latitude: latVar,
                longitude: lonVar,
                county: countyVar,
                town: townVar,
                status: 'Correct!',
            })
        } else {
            // 
            // console.log(`${check} is not equal to ${this.state.townData.county}`)
            this.setState(state => ({
                status: 'Wrong! Guess again or keep searching!',
                points: state.points - 10,
            }))
        }
        this.setState({
            modalDisplayed: true
        })
    }

    cancelHandler = (evt) => {
        evt.preventDefault();
        console.log('What is this: ' + evt.target.textContent)
        if (evt.target.textContent === 'Cancel') {
            this.setState({
                modalDisplayed: false,
            })
        }
    }

    render() {

        // Centering the map on [44.0886, -72.7317]
        let vtBorder = borderData.geometry.coordinates[0].map(coordSet => {
            return [coordSet[1], coordSet[0]]
        })

        return ( // You can only return one thing, so put entire JSX in one div

            <div id='mainContainer'>

                <div id='statusHeader'>
                    <h2>Status: {this.state.status}</h2>
                    <h3>Score = {this.state.points}</h3>
                    <div id='statusBar'>
                        <h2>Latitude = {this.state.latitude} </h2>
                        <h2>Longitude = {this.state.longitude} </h2>
                        <h2>County = {this.state.county}  </h2>
                        <h2>Town = {this.state.town}</h2>
                    </div>
                </div>
                {this.state.modalDisplayed === true ? <GuessCountyModal handleCancel={this.cancelHandler} listGuess={this.guessButtonHandler} /> : null}
                <div>
                    <Map center={defaultPos} zoom={defaultZoom} style={{ height: '600px', width: '600px' }} zoomControl={false} scrollWheelZoom={false} touchZoom={false} doubleClickZoom={false} dragging={false}>
                        <TileLayer
                            url='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community' />

                        <Polygon positions={vtBorder} />

                    </Map>
                </div>
                <div id='gameButtons'>
                    <button disabled={this.state.playing} onClick={this.clickHandlerStart}>Start Game</button>
                    <button disabled={!this.state.playing} onClick={this.guessButtonHandler} handleCancel={this.cancelHandler} listGuess={this.guessButtonHandler}>Guess</button>
                    <button disabled={!this.state.playing} onClick={this.giveUpHandler}>Give Up</button>

                </div>
                <div id='centerButtons'>
                    <div id='navigationButtons'>
                        <button>North</button>
                        <div id='eastWestButtons'>
                            <button>East</button>
                            <button>West</button>
                        </div>
                        <button>South</button>
                    </div>
                </div>
            </div>
        )
    }
}

function GuessCountyModal(props) {
    let countyList = ['Grand Isle', 'Franklin', 'Orleans', 'Essex', 'Chittenden', 'Lamoille', 'Caledonia', 'Washington', 'Addison', 'Bennington', 'Orange', 'Rutland', 'Windham', 'Windsor']
    return (
        <div id='guess-list'>
            <ol>
                {countyList.map(county => (
                    <li className='county-guess' key={county} >
                        <button onClick={props.listGuess}>{county} </button>
                    </li>
                ))}
            </ol>


            <button onClick={props.handleCancel}>Cancel</button>

        </div>
    );
}

export default VTMap
