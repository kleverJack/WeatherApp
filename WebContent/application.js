// app Id for openweathermap
var weatherAppId='e26c3766ab011b590406d41e1b1c6d05';
// apk key for google maps
var googleAPIKey='AIzaSyCP4v-UrJkxIHfEoc58yhOhC1PGx4m6tP8';
var app=angular.module('WeatherApp',[]);
app.service("geolocation", ["$q", "$window", "$timeout","$http", function($q, $window, $timeout, $http){
    this.locate = function(timeoutVal){
      var defered = $q.defer(),
          n = $window.navigator,
          timeoutVal = timeoutVal || 10000,
          options = { timeout: timeoutVal };

      // Custom error objects
      var notSupportedError = {
            code: 4,
            message: 'Your device does not support Geolocation.'
          },
          requestIgnoredError = {
            code: 5,
            message: 'You need to grant us the permission to use your current location.'
          };

      // Here we reject the promise anyways after the specified timeout
      $timeout(function(){
        defered.reject(requestIgnoredError);
      }, options.timeout);

      // Check if geolocation is supported
      if(n.geolocation){
        n.geolocation.getCurrentPosition(positionSuccess, positionError, options);
      } else {
        defered.reject(notSupportedError);
      };

      function positionSuccess(position){
        // resolve the promise with the position object
        defered.resolve(position);
      };
      function positionError(error){
        // reject the promise with the error object provided by the Geolocation API
        defered.reject(error);
      };
      return defered.promise;
    };

    this.locateFromZip = function(zip,country,timeoutVal){
      var defered = $q.defer(),
          timeoutVal = timeoutVal || 10000,
          options = { timeout: timeoutVal };

      // Custom error objects
      var invalidLocationError = {
            code: 8,
            message: 'The location does not exist'
          },
          requestFailedError = {
            code: 7,
            message: 'The location details could not be fetched.'
          };

      // Here we reject the promise anyways after the specified timeout
      $timeout(function(){
        defered.reject(requestFailedError);
      }, options.timeout);
      var locationURL="https://maps.googleapis.com/maps/api/geocode/json?components=postal_code:"+zip+",country:"+country+"&key="+googleAPIKey;
      $http.get(locationURL,options).then(function(locationData){
        if('ZERO_RESULTS'==locationData.data.status.trim()) {
			defered.reject(invalidLocationError);
		} else {
			defered.resolve(locationData.data);
		}
      },function(error){
        defered.reject(requestFailedError);
      });

      return defered.promise;
    };

    this.countries = function(timeoutVal) {
      var defered = $q.defer(),
          timeoutVal = timeoutVal || 10000,
          options = { timeout: timeoutVal };

      // Custom error objects
      var requestFailedError = {
            code: 6,
            message: 'Country List could not be fetched.'
          };
      // Here we reject the promise anyways after the specified timeout
      $timeout(function(){
        defered.reject(requestFailedError);
      }, options.timeout);

      $http.get("https://restcountries.eu/rest/v1/all",options).then(function(countryList){
        defered.resolve(countryList);
      },function(error){
        defered.reject(requestFailedError);
      });

      return defered.promise;
    };

    this.shortName = function(addressComponents,componentType) {
      for(var i=0;i<addressComponents.length;i++) {
        if(addressComponents[i].types.indexOf(componentType)>=0) {
          return addressComponents[i].short_name;
        }
      }
      return null;
    };
  }]);

app.controller('LocationController',['$scope','$http','$timeout','geolocation',function($scope,$http,$timeout,geolocation){
  $scope.flashMessage=function(message){
    $scope.message=message || null;
    $timeout(function(){
      $scope.message=null;
    },5000);
  };

  $scope.clearPage=function() {
    $scope.userLocation=null;
    $scope.weatherCondition=null;
    if(null==($scope.countryList || null)) {
      geolocation.countries(3000).then(function(countryList){
        $scope.countryList=countryList.data;
      });
    }
  };

  $scope.findLocation=function() {
    geolocation.locate(5000).then(
      function(position) {
        $scope.userLocation={
          zip:null,
          country:null,
          latitude:position.coords.latitude,
          longitude:position.coords.longitude
        };
        var reverseGeoCodeURL="https://maps.googleapis.com/maps/api/geocode/json?latlng="
          +$scope.userLocation.latitude+","+$scope.userLocation.longitude+"&key="+googleAPIKey;
        $http.get(reverseGeoCodeURL).then(function(data){
          if(data.status==200) {
            $scope.userLocation.zip=geolocation.shortName(data.data.results[0].address_components,'postal_code');
            $scope.userLocation.country=geolocation.shortName(data.data.results[0].address_components,'country');
          }
        });
      },
      function(error) {
        $scope.flashMessage("You seem invisible. Please locate yourself");
      });
  };
  $scope.getWeatherInfo=function(){
    var weatherURL=null;
    $scope.weatherCondition=null;
    if($scope.userLocation!=null) {
      if(null!=$scope.userLocation.zip && null!=$scope.userLocation.country) {
        geolocation.locateFromZip($scope.userLocation.zip,$scope.userLocation.country,5000).then(function(locationFromZip){
          weatherURL="http://api.openweathermap.org/data/2.5/weather?zip="+$scope.userLocation.zip+","+$scope.userLocation.country+"&units=metric&appid="+weatherAppId;
          $http.get(weatherURL).then(function(data){
            if(200==data.status) {
              var weatherData=data.data;
              if(200==weatherData.cod) {
                $scope.weatherCondition=weatherData;
              }
              console.log($scope.weatherCondition);
            }
            if(null==$scope.weatherCondition) {
              $scope.clearPage();
              $scope.flashMessage("You seem to be in the middle of nowhere.");
            }
          },function(error) {
            $scope.flashMessage("Something doesn't seem right. Please try again.");
          });
        }, function(error){
          $scope.flashMessage("You seem to be in the middle of nowhere.");
        })

      } else {
        $scope.flashMessage("Please ensure that you have been located");
      }
    } else {
      $scope.flashMessage("Please ensure that you have been located");
    }
  };

  $scope.clearPage();
}]);
