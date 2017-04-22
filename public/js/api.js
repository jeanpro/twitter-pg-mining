
// Helper functions
function appendAlert(alertText, alertClass){
  var alert ='<div class=\"alert ' + alertClass + ' alert-dismissible fade in\" role=\"alert\"> <button type=\"button\" class=\"close\" data-dismiss=\"alert\" aria-label=\"Close\"><span aria-hidden=\"true\">×</span></button>' + alertText +'</div>';
  $('#alertContainer').html(alert);
   $("html, body").animate({ scrollTop: 0 }, "slow");
}

function prependAlert(alertText, alertClass, selector,isAutoClose){
  var autoclose = isAutoClose || false;
  clearAlert(selector);
  var alert ='<div id="prependAlert" class=\"alert ' + alertClass + ' alert-dismissible fade in\" role=\"alert\"> <button type=\"button\" class=\"close\" data-dismiss=\"alert\" aria-label=\"Close\"><span aria-hidden=\"true\">×</span></button>' + alertText +'</div>';
  $(selector).prepend(alert);
  
  if(autoclose){
    $("#prependAlert").fadeTo(2000, 500).slideUp(500, function(){
    $("#prependAlert").slideUp(500);
  }); 
  }
}

function clearAlert(selector){
  $(selector).find('.alert').remove();
}

//Unescape HTML
function htmlDecode(input){
  var e = document.createElement('div');
  e.innerHTML = input;
  return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
}


// Configure next button
function nextTweets(next){
  //Check if is null
  if(next === undefined){
    $("#next").on('click',function(event){
      appendAlert("No more tweets available.",'alert-warning');
    });
    return;
  }
  
  var param = next.split('?')[1];
  if(param === null){
    console.log("Error on splitting: "+next.split('?'));
    return;
  }
  //Parse URI params to JS object
  try { 
    paramObj = JSON.parse('{"' + decodeURIComponent(param).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g,'":"') + '"}');
  } catch(e) { 
    console.error(e); 
    return;
  }
  //Get elements
  var max_id = paramObj.max_id;
  var query = paramObj.q;
  //store next query-string in the button
  var btn = $('#next')[0];

  $.data(btn,'max_id',max_id); // the maxid of the next query is the minimum of the previous one!
  $.data(btn,'query',query);

  $('#next').on('click', function(event){
    var sinceID = $.data(event.currentTarget, 'max_id');
    var q = $.data(event.currentTarget, 'query');
    $("#console").html('Loading...');
    $.ajax({
      type: 'GET',
      url: '/events/tweets/next',
      data: {max_id:sinceID, q:q},
      success: function(data){
        if(data.success === false){
          appendAlert(JSON.stringify(data.error),'alert-danger');  
          $('#console').html('');
        }
        else{
          renderTweets(data);
        }
      }
    });
  });
}

//Return data as JSON from DOM 'tr' tweet element
function rowToJSON(ele){
  var data = {
    "id":"",
    "tweet_created_at":"",
    "userid":"",
    "tweet":"",
    "coordinates":"",
    "favorite_count":"",
    "retweet_count":"",
    "status":"",
    "hashtags":{}
  };
  var hashtagArray = new Array();
  var status; // Custom field status: Positive, Negative, Unknown
  var counterArray; // Favorited/Retweeted
  //Sanity check
  if($(ele).attr('id') === undefined){
    return false;
  }

  // Get tweet id
  data.id = $(ele).attr('id');

  //Check relevance
  if($(ele).hasClass('danger')){
    status = "negative";
  }
  else if($(ele).hasClass('success')){
    status = "positive";
  }
  else{
    status = "unknown";
  }

  // Setup tweet status
  data.status = status;

  //Get cells
  var cells = $(ele).find('td');

  //Sanity check
  if(cells.length < 6){
    return false;
  }

  //Get data
  $.each(cells, function(i,e){
    switch(i){
      case 0: 
        data.tweet_created_at = moment($(e).html(),"ddd MMM DD HH:mm:ss").format().toString();
        break;
      case 1:
        data.userid = $(e).html();
        break;
      case 2:
        data.tweet = $(e).html();
        break;
      case 3:
        if($(e).html() != ""){
          hashtagArray = $(e).html().split(',');
            $.each(hashtagArray, function(j,ele){
                data.hashtags[j] = {
                  "name":ele, 
                  "status":status
                }
            });
        }
        break;
      case 4:
        data.coordinates = $(e).html() === ""? null:$(e).html();
        break;
      case 5:
        counterArray = $(e).html().split('/');
        if(counterArray.length == 2){
          data.favorite_count = counterArray[0];
          data.retweet_count = counterArray[1];
        }
        else{
          data.favorite_count = 0;
          data.retweet_count = 0;
        }
        break;
      default:
        break;
    }
  });
  return data;
}

//Render tweets in console
function renderTweets(data){
  // Render data
  var size = data.tweets.statuses.length;
  if(size != 0){
    $('#console').html(data.html); 
    $(".j-hidden").show(); //show option buttons
  }
  else{
    $("#console").html('No tweets found...');
    return;
  }

  console.log(data.meta);

  //Update next button
  nextTweets(data.next);

  //Toogle class to remove tweet from upload to database
  $("#tweets tbody tr").on('click',function(event){
    var ele = $(this);
    if(ele.hasClass('danger')){
      ele.removeClass('danger');
      ele.addClass('success');
    }
    else if(ele.hasClass('success')){
      ele.removeClass('success');
    }
    else{
      ele.addClass('danger');
    }
  });

  //Get Embedded HTMLs for tweets at Twitter API (statuses/oembed)
  $('#htmls').on('click', function(event){
    $this = $(this);
    $this.button('loading');
    $(".loading").show();

    var timeout = setTimeout(function(){
      $this.button('loading');
      $(".loading").hide();
    },5000);

    var ids = new Array();
    $("#tweets tbody").find('tr').each(function(i, e){
        ids.push($(e).attr('id'));
    });
    console.log(ids);
    var promises = new Array();
    ids.forEach(function(e,i){
      var request = $.get('/events/tweets/embed/'.concat(e)).then(function(tweetdata){
        return tweetdata.success;
      }).fail(function(err){
        console.log(err);
      });
      promises.push(request);
    });

    $.when.apply($, promises).then(function(data){
      appendAlert("HTML successfully saved on DB. Check Console for more details.", 'alert-success');
      console.log("Sending HTML...");
      if(data){
          console.log("Success!");        
      }
      else{
        console.log("Something went wrong.");
      }
      clearTimeout(timeout);
      $this.button('reset');
      $(".loading").hide();
    });
  });

  //Update save button
  $("button.save").on('click',function(event){
    var $this = $(this);
    var data = new Array();
    $(".loading").show();

    // Loading
    $this.button('loading');
    // Save tweets
    $("#tweets tbody").find('tr').each(function(i, e){
        data.push(rowToJSON(e));
    });
    //Get Status using machine learning
    var body = {ids:[],texts:[]};
    data.forEach(function(e,i){
      body.ids.push(e.id);
      body.texts.push(e.tweet);
    });
    //Send tweets to DB
    $.ajax({
      type:'POST',
      url:'/api/tweets/batch',
      contentType: 'application/json',
      data:JSON.stringify(data),
      success:function(data){
        if(data.success === true){
              appendAlert("Tweets successfully saved in the DB.", 'alert-success');
              //Send Status to DB
              $.ajax({
                type:'POST',
                contentType: 'application/json',
                url:'/events/tweets/status/batch',
                data:JSON.stringify(body),
                success:function(data){
                  if(data.success){
                    appendAlert("Tweets and Statuses successfully saved in DB",'alert-success');
                  }
                }
              })
          }
          else{
            appendAlert(data.error, 'alert-danger');
          }
        $this.button('reset');
        $(".loading").hide();
      },
      error: function(jqXHR, textStatus, errorThrown){
          console.log(errorThrown);
          $this.button('reset');
          $(".loading").hide();
        }
    });
  });

  // Display API rate
  $('#status').html(data.rate);

  //Display tweet on click
  $('.view-tweet').on('click', function(event){
    event.stopPropagation();
    $("#tweetEmbed").html('');
    $.ajax({
      type: 'GET',
      url: '/events/tweets/embed/'.concat($(this).closest('tr').attr('id')),
      success: function(data){
        if(data.success === true){
          $("#tweetEmbed").hide();
          $("#tweetEmbedLoading").show();
          $("#tweetEmbed").html(data.html === null? data.dbhtml:htmlDecode(data.html));
          twttr.widgets.load(
            document.getElementById("tweetEmbed")
          );
          twttr.events.bind(
            'loaded',
            function (event) {
              $("#tweetEmbed").show();
              $("#tweetEmbedLoading").hide();
            }
          );
          $('#tweetModal').modal('show');
        }
        else{
          appendAlert(JSON.stringify(data.error),'alert-danger'); 
          console.log(data);
        }
      }
    })
  });

    //Remove 'null' on coordinates
  var cells = $('#tweets').find('td');
  cells.each(function(i, e){
    if($(this).text() === 'null'){
      $(this).text('');
    }
  });
  //Remove favorited/retweeted == 0/0
  var tds = $('#tweets').find('td');
  tds.each(function(i, e){
    if($(this).text() === '0/0'){
      $(this).text('');
    }
  });

  //All buttons
  $("#allsuccess").on('click', function(event){
    $("#tweets tbody").find('tr').removeClass('danger');
    $("#tweets tbody").find('tr').addClass('success');
  });

  $("#alldanger").on('click', function(event){
    $("#tweets tbody").find('tr').removeClass('success');
    $("#tweets tbody").find('tr').addClass('danger');
  });
  $("#allunknown").on('click', function(event){
    $("#tweets tbody").find('tr').removeClass('success');
    $("#tweets tbody").find('tr').removeClass('danger');
  });
}

$("#uploadDBConfirmed").on("click",function(event){
  event.preventDefault();
  prependAlert('Loading, please wait...', 'alert-info','#uploadConfirmationModal .modal-body');
  $("#uploadConfirmationModal .modal-footer").find("button").button('loading');
  $.ajax({
    type: 'GET',
    url: '/api/upload',
    success: function(data){
      if(data.success){
        prependAlert('DB updated successfully.', 'alert-success','#uploadConfirmationModal .modal-body',true);
        setTimeout(function(){
          $("#uploadConfirmationModal").modal('hide');
        },2000);
      }else{
        prependAlert('Error while updating DB. Please, check console.', 'alert-danger','#uploadConfirmationModal .modal-body');
        console.log(data);
      }
    },
    error: function(err){
      prependAlert('Error while updating DB. Please, check console.', 'alert-danger','#uploadConfirmationModal .modal-body');
      console.log(err);
    }
  });
});

$("#getTweets").on("click",function(event){
  event.preventDefault();
  prependAlert('Loading, please wait...', 'alert-info','#dataMining .modal-body');
  $.ajax({
    type: 'GET',
    url: '/api/mining',
    success: function(data){
      if(data.success){
        prependAlert(data.msg, 'alert-success','#dataMining .modal-body',true);
        setTimeout(function(){
          $("#dataMining").modal('hide');
        },2000);
      }else{
        prependAlert(data.error, 'alert-danger','#dataMining .modal-body');
        console.log(data);
      }
    },
    error: function(err){
      prependAlert('Error during Data Mining process. Please, check console.', 'alert-danger','#dataMining .modal-body');
      console.log(err);
    }
  });
});


// On Initialization
$(document).ready(function(){
  var radiusSlider = $("#radiusSlider").slider();
   $("#radius").val(radiusSlider.slider('getValue'));
   //Reset modals
   $("#dataMining").on("hidden.bs.modal",function(){
      $("#filename").val("");
      clearAlert("#dataMining .modal-body");
   });

   $("#uploadConfirmationModal").on("hidden.bs.modal",function(){
      clearAlert("#uploadConfirmationModal .modal-body");
      $("#uploadConfirmationModal .modal-footer").find("button").button('reset');
   });

   //Load IDs to temp
   $("#listTweets").on('click',function(e){
      e.preventDefault();
      var filename = $("#filename").val();
      prependAlert("Loading...","alert-info","#dataMining .modal-body");
      $.ajax({
        url:'/api/loadids/',
        data: {filename:filename},
        success: function(data){
          clearAlert("#dataMining .modal-body");
          if(data.success){
            prependAlert("Tweet IDs successfully loaded!", "alert-success","#dataMining .modal-body");
          }else{
            console.log(data);
            prependAlert("Unable to load IDs to temporary DB. Check console.", "alert-danger","#dataMining .modal-body");
          }
        },
        error:function(errorThrown){
        clearAlert("#dataMining .modal-body");
        console.log(errorThrown);
        prependAlert("Error! Check Console for more information","alert-danger","#dataMining .modal-body");
        }
      });

   });
   $('.loading').hide();
});


//Events

$("#radiusSlider").on("slide", function(slideEvt) {
    $("#radius").val(slideEvt.value);
});

$("#eventQuery").on('submit', function(e){
  $(".loading").show();
  e.preventDefault();
  var datastring = $('#eventQuery').serialize();
  $('#console').html("Loading...");
  $.ajax({
    type: "POST",
    url: '/events/tweets/list',
    data: datastring,
    success: function(data){
      if(data.success === false){
        clearAlert();
        appendAlert(JSON.stringify(data.error),'alert-danger');  
        $('#console').html('');
      }
      else{
        renderTweets(data);
      }
      $(".loading").hide();
    },
    error: function(jqXHR, textStatus, errorTrown){
      $('#console').html(errorTrown);
      $(".loading").hide();
    }
  });
});

