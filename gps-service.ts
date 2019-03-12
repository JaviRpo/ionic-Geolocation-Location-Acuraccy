import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {forkJoin} from "rxjs/observable/forkJoin";
import {Observable} from "rxjs/Observable";
import {Diagnostic} from "@ionic-native/diagnostic";
import {Geolocation, Geoposition} from "@ionic-native/geolocation";
import {AlertController, App} from "ionic-angular";
import {LocationAccuracy} from "@ionic-native/location-accuracy";
import {Observer} from "rxjs/Observer";

declare var google;
@Injectable()
export class GpsServiceProvider {
  nav: any;
  geocoder: any;

  constructor(public http: HttpClient, private diagnostic: Diagnostic, public geolocation: Geolocation, private alertCtrl: AlertController, public app: App, private locationAccuracy: LocationAccuracy) {
    this.nav = this.app.getActiveNav();
    this.geocoder = new google.maps.Geocoder;
    console.log('Hello GpsServiceProvider Provider');
  }
  
   getUserPosition() {
    return new Promise(resolve => {
      const HIGH_ACCURACY = 'high_accuracy';
      this.diagnostic.isLocationEnabled().then(enabled => {
        if (enabled) {
          this.diagnostic.getLocationMode().then(locationMode => {
            if (locationMode === HIGH_ACCURACY) {
              this.geolocation.getCurrentPosition({
                timeout: 30000,
                maximumAge: 0,
                enableHighAccuracy: true
              }).then(pos => {
                resolve({
                  coords: {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude
                  }
                });
              }).catch(error => resolve(error));
            } else {
              this.askForHighAccuracy().then(available => {
                if (available) {
                  this.getUserPosition().then(a => resolve(a), e => resolve(e));
                }
              }, error => resolve(error));
            }
          });
        } else {
          this.locationAccuracy.request(1).then(result => {
            if (result) {
              this.getUserPosition().then(result => resolve(result), error => resolve(error));
            }
          }, error => {
            resolve(error)
          });
        }
      }, error => {
        resolve(error)
      });

    });
  }

  askForHighAccuracy(): Promise<Geoposition> {
    return new Promise(resolve => {
      this.locationAccuracy
        .request(this.locationAccuracy.REQUEST_PRIORITY_HIGH_ACCURACY).then(() => {
        this.geolocation.getCurrentPosition({timeout: 30000}).then(
          position => {
            resolve(position);
          }, error => resolve(error)
        );
      }, error => resolve(error));
    });
  }
  decodeCoordObs(lat, long): Observable<any> {
    var latlng = new google.maps.LatLng(lat, long);
    return Observable.create((observer: Observer<any>) => {
      // Invokes geocode method of Google Maps API geocoding.
      this.geocoder.geocode({'latLng': latlng}, (
        (results, status) => {
          if (status === google.maps.GeocoderStatus.OK) {
            observer.next(results);
            observer.complete();
          } else {
            console.log('Geocoding service: geocoder failed due to: ' + status);
            observer.error(status);
          }
        })
      );
    });
  }

  decodeCoordPromise(lat, long) {
    var latlng = new google.maps.LatLng(lat, long);
    return new Promise((resolve, reject) => {
      this.geocoder.geocode({'latLng': latlng}, (results, status) => {
        if (status == google.maps.GeocoderStatus.OK) {
          //this.city = this.decodeCity(results);
          resolve(this.decodeCity(results));
        } else {
          reject();
        }
      })
    });
  }

  decodeCity(results) {
    var cityDecode = "";
    if (results[1]) {
      var indice = 0;
      for (var j = 0; j < results.length; j++) {
        if (results[j].types[0] == 'locality') {
          indice = j;
          break;
        }
      }
      let city, region, country;
      for (var i = 0; i < results[j].address_components.length; i++) {
        if (results[j].address_components[i].types[0] == "locality") {
          //this is the object you are looking for City
          city = results[j].address_components[i];
        }
        if (results[j].address_components[i].types[0] == "administrative_area_level_1") {
          //this is the object you are looking for State
          region = results[j].address_components[i];
        }
        if (results[j].address_components[i].types[0] == "country") {
          //this is the object you are looking for
          country = results[j].address_components[i];
        }
      }
      cityDecode = city.long_name;
    } else {
      console.log("No results found");
      cityDecode = "";
    }
    return cityDecode;
  }
  
  }
