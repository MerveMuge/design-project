import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  Button,
} from 'react-native';
import { Camera } from 'expo-camera';
import * as Permissions from 'expo-permissions';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import axios from 'axios';
import {
  FontAwesome,
  Ionicons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import GameCard from './GameCard';

import Confetti from 'react-native-confetti';

var config = require('../config.json');

export default class CameraScreen extends React.Component {
  static navigationOptions = ({ navigation }) => {
    return {
      title: 'Photo',
      headerRight: <View />
    };
  };

  constructor(props) {
    super(props);

    this.onCameraReady = this.onCameraReady.bind(this);
  }

  state = {
    hasPermission: null,
    hasLocation: null,
    previewUri: '',
    sent: false,
    accepted: false,
    card: {},
    description: '',
  };

  async componentDidMount() {
    this.getPermissionAsync();
  }

  getPermissionAsync = async () => {
    // Camera roll Permission
    if (Platform.OS === 'ios') {
      const { status } = await Permissions.askAsync(Permissions.CAMERA_ROLL);
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to make this work!');
      }
    }
    // Camera Permission
    const { status } = await Permissions.askAsync(Permissions.CAMERA);
    this.setState({ hasPermission: status === 'granted' });

    // Location Permission
    let { locationStatus } = await Permissions.askAsync(Permissions.LOCATION);
    this.setState({ hasLocation: locationStatus === 'granted' });
  };

  takePicture = async () => {
    if (this.camera) {
      let photo = await this.camera.takePictureAsync({ skipProcessing: true });
      //console.log(photo);
      this.setState({ previewUri: photo.uri });
    }
  };

  async sendPicture() {
    this.setState({ sent: true });
    let data = new FormData();
    let location = await Location.getCurrentPositionAsync({});
    var locationData = {
      longitude: location.coords.longitude,
      latitude: location.coords.latitude,
    };
    //console.log(locationData);
    data.append('location', JSON.stringify(locationData));
    /*const manipResult = await ImageManipulator.manipulateAsync(
        this.state.previewUri,
        [],
        {
          compress: 0.5,
        }
      );
      console.log(manipResult);*/
    await data.append('file', {
      uri: this.state.previewUri,
      type: 'image/jpeg', // or photo.type
      name: 'photo.jpg',
    });
    console.log('image uploading...');
    axios
      .post(config.server + '/api/upload', data)
      .then(res => {
        //console.log(res);
        if (!res.data.accepted) {
          Alert.alert(
            'Wrong',
            res.data.message,
            [
              {
                text: 'Try Again',
                onPress: () => this.setState({ previewUri: null, sent: false }),
              },
              {
                text: 'Menu',
                onPress: () => this.props.navigation.navigate('MainMenu'),
              },
            ],
            { cancelable: false }
          );
        } else {
          this.setState({
            description: res.data.message,
            accepted: res.data.accepted,
            card: res.data.card,
          });
          if (this._confettiView) {
            this._confettiView.startConfetti();
          }
        }
      })
      .catch(err =>
        Alert.alert(
          'Wrong',
          'It is not a photo of famous place!',
          [
            {
              text: 'Try Again',
              onPress: () => this.setState({ previewUri: null, sent: false }),
            },
            {
              text: 'Menu',
              onPress: () => this.props.navigation.navigate('MainMenu'),
            },
          ],
          { cancelable: false }
        )
      );
  }

  async onCameraReady() {
    var sizes = await this.camera.getAvailablePictureSizesAsync('4:3');
    //console.log(sizes);
    if (sizes && sizes.length && sizes.length > 0)
      this.camera.pictureSize = sizes[0];
  }

  renderCamera() {
    return (
      <Camera
        style={{ flex: 1 }}
        onCameraReady={this.onCameraReady}
        ratio="4:3"
        type={this.state.cameraType}
        ref={ref => {
          this.camera = ref;
        }}
      />
    );
  }

  renderBottom() {
    if (this.state.previewUri) {
      if (!this.state.sent) {
        return (
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-around',
            }}>
            <TouchableOpacity
              style={{
                width: '40%',
                backgroundColor: '#fb5b5a',
                borderRadius: 25,
                height: 50,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 40,
                marginBottom: 10,
              }}
              onPress={() => this.setState({ previewUri: null })}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>
                Take another picture
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                width: '40%',
                backgroundColor: '#fb5b5a',
                borderRadius: 25,
                height: 50,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 40,
                marginBottom: 10,
              }}
              onPress={() => this.sendPicture()}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Send</Text>
            </TouchableOpacity>
          </View>
        );
      } else {
        return (
          <View style={{ justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: 'white' }}>Waiting for response...</Text>
            <ActivityIndicator
              style={{
                alignSelf: 'center',
                alignItems: 'center',
                backgroundColor: 'transparent',
              }}
              size="large"
              color="#fb5b5a"
            />
          </View>
        );
      }
    } else {
      return (
        <TouchableOpacity
          style={{
            alignSelf: 'flex-end',
            alignItems: 'center',
            backgroundColor: 'transparent',
          }}
          onPress={() => this.takePicture()}>
          <FontAwesome
            name="camera"
            style={{ color: '#fff', fontSize: 40, marginBottom: 10 }}
          />
        </TouchableOpacity>
      );
    }
  }

  render() {
    const { hasPermission, hasLocation } = this.state;
    if (hasPermission === null || hasLocation === null) {
      return <View />;
    } else if (hasPermission === false) {
      return <Text>No access to camera</Text>;
    } else if (this.state.accepted) {
      return (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => this.props.navigation.navigate('MainMenu')}
          style={{ flex: 1, alignItems: 'center', backgroundColor: '#003f5c' }}>
          <Text
            style={{
              textAlign: 'center',
              fontSize: 30,
              color: 'white',
              fontWeight: 'bold',
              marginBottom: 10,
            }}>
            Congratulations
          </Text>
          <Image
            source={{ uri: this.state.previewUri }}
            style={{ width: 200, height: 267, backgroundColor: 'black' }}
          />
          <Text
            style={{ marginBottom: 20, fontWeight: 'bold', color: 'white' }}>
            {this.state.description}
          </Text>
          <GameCard
            color={this.state.card.color}
            type={this.state.card.type}
            power={this.state.card.power}
          />
          <Text style={{ color: 'white' }}>Click to continue</Text>
          <Confetti ref={node => (this._confettiView = node)} />
        </TouchableOpacity>
      );
    } else {
      return (
        <View style={{ flex: 1, backgroundColor: '#003f5c' }}>
          {!this.state.previewUri ? (
            this.renderCamera()
          ) : (
            <Image
              style={{ flex: 1 }}
              source={{ uri: this.state.previewUri }}
            />
          )}
          <View
            style={{
              height: 100,
              flexDirection: 'row',
              justifyContent: 'center',
              paddingBottom: 25,
            }}>
            {this.renderBottom()}
          </View>
        </View>
      );
    }
  }
}
