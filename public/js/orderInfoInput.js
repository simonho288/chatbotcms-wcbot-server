"use strict";function SetupInputInfo(){if(null!=window._shoppingCart.input_info){var n=$("#billing_form"),e=$("#shipping_form"),i=window._shoppingCart.input_info.billing;n.find('[name="first_name"]').val(i.first_name),n.find('[name="last_name"]').val(i.last_name),n.find('[name="email"]').val(i.email),n.find('[name="phone"]').val(i.phone),n.find('[name="address1"]').val(i.address1),n.find('[name="address2"]').val(i.address2),n.find('[name="city"]').val(i.city),n.find('[name="state"]').val(i.state),n.find('[name="postal"]').val(i.postal),n.find('[name="country"]').dropdown("set selected",i.country),OnFormCountryChanged(n,i.country),n.find('[name="state"]').dropdown("set selected",i.state);var a=window._shoppingCart.input_info.shipping;e.find('[name="first_name"]').val(a.first_name),e.find('[name="last_name"]').val(a.last_name),e.find('[name="address1"]').val(a.address1),e.find('[name="address2"]').val(a.address2),e.find('[name="city"]').val(a.city),e.find('[name="postal"]').val(a.postal),e.find('[name="country"]').dropdown("set selected",a.country),OnFormCountryChanged(e,a.country),e.find('[name="state"]').dropdown("set selected",a.state),i.first_name===a.first_name&&i.last_name===a.last_name&&i.address1===a.address1&&i.address2===a.address2&&i.city===a.city&&i.state===a.state&&i.postal===a.postal&&i.country===a.country&&($('[name="same_as_billing"]').prop("checked","checked"),e.find("input").each(function(n){$(this).prop("disabled",!0)}),e.find(".dropdown").each(function(n){$(this).addClass("disabled")}))}}function SetupUI(){$(".ui.search.dropdown").dropdown(),$(".ui.checkbox").checkbox(),$("#btn_proceed").click(onBtnProceed),$("#btn_back").click(onBtnBack),$('[name="same_as_billing"]').change(onCbSameAsBilling),$('#billing_form [name="country"]').on("change",function(n){OnFormCountryChanged($("#billing_form"),n.target.value)}),$('#shipping_form [name="country"]').on("change",function(n){OnFormCountryChanged($("#shipping_form"),n.target.value)}),$(".loading_wrapper").hide(),$(".loaded_wrapper").show()}function LoadShoppingCart(){return $.ajax({method:"GET",url:"/db_loadcart",data:{uid:window._userId,rid:window._recipientId}})}function CalcOrderTotal(){var n=0;$.each(window._shoppingCart.cart_items,function(e,i){n+=i._qty*i._unitPrice});var e=util.ParseCurrencyToDisp(window._shoppingCart.server_settings.currency,n);$("#order_total").html(e),$("#total_div").show()}function LoadWcOrderIfExists(){if(null==window._orderId||""==window._orderId)return $(".loading_wrapper").hide(),void $(".loaded_wrapper").show();$.ajax({method:"GET",url:"/get_wc_order",data:{oid:window._orderId,uid:window._userId,rid:window._recipientId}}).done(function(n){e=$("#billing_form");e.find('[name="first_name"]').val(n.billing.first_name),e.find('[name="last_name"]').val(n.billing.last_name),e.find('[name="email"]').val(n.billing.email),e.find('[name="phone"]').val(n.billing.phone),e.find('[name="address1"]').val(n.billing.address_1),e.find('[name="address2"]').val(n.billing.address_2),e.find('[name="city"]').val(n.billing.city),e.find('[name="postal"]').val(n.billing.postcode),e.find('[name="country"]').dropdown("set selected",n.billing.country),OnFormCountryChanged(e,n.billing.country),e.find('[name="state"]').dropdown("set selected",n.billing.state);var e;(e=$("#shipping_form")).find('[name="first_name"]').val(n.shipping.first_name),e.find('[name="last_name"]').val(n.shipping.last_name),e.find('[name="address1"]').val(n.shipping.address_1),e.find('[name="address2"]').val(n.shipping.address_2),e.find('[name="city"]').val(n.shipping.city),e.find('[name="postal"]').val(n.shipping.postcode),e.find('[name="country"]').dropdown("set selected",n.shipping.country),OnFormCountryChanged(e,n.shipping.country),e.find('[name="state"]').dropdown("set selected",n.shipping.state),n.billing.first_name===n.shipping.first_name&&n.billing.last_name===n.shipping.last_name&&n.billing.address_1===n.shipping.address_1&&n.billing.address_2===n.shipping.address_2&&n.billing.city===n.shipping.city&&n.billing.state===n.shipping.state&&n.billing.postcode===n.shipping.postcode&&n.billing.country===n.shipping.country&&($('[name="same_as_billing"]').prop("checked","checked"),e.find("input").each(function(n){$(this).prop("disabled",!0)}),e.find(".dropdown").each(function(n){$(this).addClass("disabled")})),$(".loading_wrapper").hide(),$(".loaded_wrapper").show()})}function ExtractCountries(){var n={};$.each(window._shoppingCart.server_settings.country.options,function(e,i){var a=e.split(":"),t=a[0],d=i.split(" - "),o=d[0];null==n[t]?(n[t]={name:o},a.length>1&&(n[t].states={},n[t].states[a[1]]=d[1])):n[t].states[a[1]]=d[1]}),window._countries=n}function onCbSameAsBilling(n){var e=this.checked,i=$("#billing_form"),a=$("#shipping_form");if(i.find('[name="country"]').val()!=a.find('[name="country"]').val()){var t=i.find('[name="state"] > option').clone(),d=a.find('[name="state"]');d.dropdown("clear"),d.empty().append(t)}a.find("input, select").each(function(n){var a=$(this).prop("name");if(a.length>0){if(e){var t=i.find('[name="'+a+'"]').val();"SELECT"===this.tagName?($(this).dropdown("setup select"),$(this).dropdown("set selected",t),$(this).dropdown("refresh")):$(this).val(t)}"INPUT"===this.tagName?$(this).prop("disabled",e):"SELECT"===this.tagName&&(e?$(this).parent().addClass("disabled"):$(this).parent().removeClass("disabled"))}})}function CountryCommonBehavior(n){var e='<option value="">Type to search</option>',i=n.find('[name="country"]');$.each(window._countries,function(n,i){e+='<option value="'+n+'">'+i.name+"</option>"}),i.html(e),i.dropdown("refresh")}function SetupBillingForm(){var n=$("#billing_form");CountryCommonBehavior(n),n.form({on:"blur",inline:!0,fields:{first_name:{identifier:"first_name",rules:[{type:"empty"}]},last_name:{identifier:"last_name",rules:[{type:"empty"}]},email:{identifier:"email",rules:[{type:"email"}]},phone:{identifier:"phone",rules:[{type:"empty"}]},address1:{identifier:"address1",rules:[{type:"empty"}]},postal:{identifier:"postal",rules:[{type:"regExp",value:"/^[a-zA-Z0-9]*$/",prompt:"Alphanumeric characters only"}]},country:{identifier:"country",rules:[{type:"empty"}]}}}),n.submit(function(n){if(!$(this).form("is valid"))return n.preventDefault(),!1;var e='<input type="hidden" name="payment_gateway" value="'+window.payment_gateway+'" />';return $(this).append(e),!0})}function SetupShippingForm(){var n=$("#shipping_form");CountryCommonBehavior(n),n.form({on:"blur",inline:!0,fields:{first_name:{identifier:"first_name",rules:[{type:"empty"}]},last_name:{identifier:"last_name",rules:[{type:"empty"}]},address1:{identifier:"address1",rules:[{type:"empty"}]},postal:{identifier:"postal",rules:[{type:"regExp",value:"/^[a-zA-Z0-9]*$/",prompt:"Can't contains hypen"}]},country:{identifier:"country",rules:[{type:"empty"}]}}}),n.submit(function(n){if(!$(this).form("is valid"))return n.preventDefault(),!1;var e='<input type="hidden" name="payment_gateway" value="'+window.payment_gateway+'" />';return $(this).append(e),!0})}function OnFormCountryChanged(n,e){var i,a=n.find('[name="state"]'),t=window._countries[e].states;null==t?i='<option value="">Type to search</option>':(i='<option value="">Type to search</option>',$.each(t,function(n,e){i+='<option value="'+n+'">'+e+"</option>"})),a.html(i),a.dropdown("clear"),a.dropdown("refresh"),a.dropdown("setup select")}function onBtnProceed(n){if($("#billing_form").form("validate form")){var e=$('[name="same_as_billing"]').prop("checked"),i=null;if(e?i=$('#billing_form [name="country"]').val():$("#shipping_form").form("validate form")&&(i=$('#shipping_form [name="country"]').val()),i){var a=$("#billing_form"),t={billing:{first_name:a.find('[name="first_name"]').val(),last_name:a.find('[name="last_name"]').val(),email:a.find('[name="email"]').val(),phone:a.find('[name="phone"]').val(),address1:a.find('[name="address1"]').val(),address2:a.find('[name="address2"]').val(),city:a.find('[name="city"]').val(),state:a.find('[name="state"]').val(),postal:a.find('[name="postal"]').val(),country:a.find('[name="country"]').val()}};if(e){var d=JSON.stringify(t.billing);t.shipping=JSON.parse(d)}else a=$("shipping_form"),t.shipping={first_name:a.find('[name="first_name"]').val(),last_name:a.find('[name="last_name"]').val(),address1:a.find('[name="address1"]').val(),address2:a.find('[name="address2"]').val(),city:a.find('[name="city"]').val(),state:a.find('[name="state"]').val(),postal:a.find('[name="postal"]').val(),country:a.find('[name="country"]').val()};EnableAllButtons(!1),window._shoppingCart.input_info=t,SaveCart().done(function(n){"ok"===n&&(window.location.href="/mwp?page=orderShipping&uid="+window._userId+"&rid="+window._recipientId)}).fail(function(n,e,i){EnableAllButtons(!0)})}}}function onBtnBack(n){var e=$("#dlg_discardwarn");e.modal("show"),e.find("#btn_ok").click(function(n){EnableAllButtons(!1);var e="/mwp?page=shopCart&uid="+window._userId+"&rid="+window._recipientId;window.location.href=e}),e.find("#btn_cancel").click(function(n){$("#dlg_discardwarn").modal("hide")})}function SaveCart(){return delete window._shoppingCart.cart_items,delete window._shoppingCart.server_settings,$.ajax({type:"POST",url:"/db_savecart",data:JSON.stringify({userId:window._userId,recipientId:window._recipientId,cart:window._shoppingCart}),contentType:"application/json"})}function EnableAllButtons(n){n?($("#btn_proceed").removeClass("disabled loading"),$("#btn_back").removeClass("disabled loading")):($("#btn_proceed").addClass("disabled loading"),$("#btn_back").addClass("disabled loading"))}$(document).ready(function(){LoadShoppingCart().done(function(n){window._shoppingCart=n,CalcOrderTotal(),ExtractCountries(),SetupBillingForm(),SetupShippingForm(),SetupInputInfo(),SetupUI()}).fail(function(n){alert(n.statusText)})});