(($) => {

    let app = {
        addToCartTrigger: false,
        submitButtonTrigger: false,
        submitButtonErrorCode: false,
        couponCode: "Hw3h69",
        cargoId: "13",
        cargoId2: "14",
        iCargoId: 2249,
        iUnloadServiceId: 2248,
        totalWeight: 0,
        maxWeight: 500,
        districts: localStorage.getItem("districts") == null ? {} : JSON.parse(localStorage.getItem("districts")),
        serviceEndpoint: "https://dev.digitalfikirler.com/ziraatci/request.php",
        wait: 0,
        selectedShippingAddress: new Object(),
        selectedShippingDistrict: '',
        selectedBillingDistrict: '',
        eventListener: {
            numberFormat: (number, decimals, dec_point, thousands_sep) => {
                number = (number + '').replace(/[^0-9+\-Ee.]/g, '');
                var n = !isFinite(+number) ? 0 : +number,
                    prec = !isFinite(+decimals) ? 0 : Math.abs(decimals),
                    sep = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep,
                    dec = (typeof dec_point === 'undefined') ? '.' : dec_point,
                    s = '',
                    toFixedFix = function (n, prec) {
                        var k = Math.pow(10, prec);
                        return '' + Math.round(n * k) / k;
                    };
                s = (prec ? toFixedFix(n, prec) : '' + Math.round(n)).split('.');
                if (s[0].length > 3) {
                    s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
                }
                if ((s[1] || '').length < prec) {
                    s[1] = s[1] || '';
                    s[1] += new Array(prec - s[1].length + 1).join('0');
                }
                return s.join(dec);
            },
            init: function() {
                let self = this;
                app.totalWeight = JSON.parse(localStorage.getItem("weight"));
                if (window.location.href.indexOf("/step3") === -1 && $(".cart-panel-row:contains('Hediye Çeki')").length) app.eventListener.disableCouponCode();
                // if (window.location.href.indexOf("/urun") > -1) $(".product-right [data-selector='add-to-cart']").removeAttr("data-selector").attr("id", "addToCart");
                if (window.location.href.indexOf('/step2') > -1) {
                    if (!$("#shippingDistrict").length) self.addDistrictField();
                    self.detectAddressUpdate();
                    self.cleanAddressField();
                    self.loadJson().then(() => {
                        self.checkShipping(); self.checkService();
                        if (app.totalWeight > app.maxWeight) app.eventListener.hideStandartCargoes();
                    });
                }
                if (window.location.href.indexOf('/hesabim/adres-defteri') > -1) self.detectNewAddress();
                if (window.location.href.indexOf("/step3") > -1) {
                    let hasCargo = false;
                    IdeaCart.items.forEach(element => { if (element.product.id === app.iCargoId) hasCargo = true; });
                    if (hasCargo !== false) self.step3CartEdit();
                }
            },
            loadDistricts: () => {
                if(Object.keys(app.districts).length == 0) {
                    $.post(app.serviceEndpoint, { action: 1 }, response => {
                        localStorage.setItem("districts", response);
                        response = JSON.parse(response);
                        app.districts = response;
                    });
                }
            },
            loadJson: async () => {
                app.selectedShippingAddress.district = ($("#address-list").length) ? $("#address-list [data-type='shipping-address-wrapper'] .address-block-header address p").text().split("|")[0].trim() : $("#step2Form #shippingDistrict option:selected").text().trim();
                app.selectedShippingAddress.county = ($("#address-list").length) ? ($("#address-list [data-type='shipping-address-wrapper'] .address-block-header address p").text().split("|")[1]).split("-")[1].trim() : $("#step2Form #shippingSubLocation option:selected").text().trim();
                app.selectedShippingAddress.province = ($("#address-list").length) ? ($("#address-list [data-type='shipping-address-wrapper'] .address-block-header address p").text().split("|")[1]).split("-")[2].trim() : $("#step2Form #shippingLocation option:selected").text().trim();
                let err = false;
                for (const key in app.selectedShippingAddress) {
                    if (typeof app.selectedShippingAddress[key] === "undefined" || app.selectedShippingAddress[key] === "" || app.selectedShippingAddress[key] === "Seçiniz" || app.selectedShippingAddress[key] === "Şehir" || app.selectedShippingAddress[key] === "İlçe"){
                       err = true;
                       break; 
                    }
                }
                if(err !== false) return false;
                await $.post(app.serviceEndpoint, { action: 2, selectedShippingAddress: JSON.stringify(app.selectedShippingAddress) }, response => {
                    response = JSON.parse(response);
                    if(response.length === 0 && $("#address-list [data-type='shipping-address-wrapper']").parents(".row:eq(0)").find(".alert").length === 0){
                        let clone = $("#address-list [data-type='shipping-address-wrapper']").parents(".row:eq(0)").find(".col-12").last().clone();
                        $("#address-list [data-type='shipping-address-wrapper']").parents(".row:eq(0)").find(".col-12").last().before($(clone));
                        $(clone).addClass("mb-3").html(`<div class="alert alert-warning" role="alert">
                            <p class="mb-0 text-center w-100">Seçilen adrese teslimat sağlanamamaktadır.</span></p>
                        </div>`);
                        $("#cart-summary #submitButton").addClass("disabled");
                        return false;
                    }
                    app.selectedShippingAddress = {
                        Max:            parseInt(response["Max"]),
                        Min:            parseInt(response["Min"]),
                        Semt:           response["Semt"],
                        Teslimat:       parseInt(response["Teslimat"]),
                        ÖzelNakliye:    parseInt(response["ÖzelNakliye"]),
                        İl:             response["İl"],
                        İlçe:           response["İlçe"],
                        İndirmeHizmeti: parseInt(response["İndirmeHizmeti"]),
                        İndirmeÜcreti:  parseInt(response["İndirmeÜcreti"])
                    };
                    $("#cart-summary #submitButton").removeClass("disabled");
                    console.log(app.selectedShippingAddress);
                });
            },
            checkService: () => {
                if(app.selectedShippingAddress.İndirmeHizmeti === 1) {
                    let unLoadService = app.selectedShippingAddress.İndirmeÜcreti * app.totalWeight;
                    let clone = $("#step2Form #checkout-gift-note").clone();
                    $(clone).attr("id", "checkout-unload-service");
                    $(clone).find(".contentbox-header h4").text("ARAÇTAN YEM İNDİRME HİZMETİ");
                    $(clone).find(".contentbox-header h4").append("<p><i><i class='fas fa-exclamation-triangle mr-2'></i>Sadece <span class='font-weight-bold'>Özel Nakliye</span> Seçiminde Aktif Olacaktır!</i></p>")
                    $(clone).find(".contentbox-body input[type='checkbox']").parent().find("label").attr("for", "unLoadService").text("Araçtan Yem İndirme Hizmeti İstiyorum " + "( +" + app.eventListener.numberFormat(unLoadService, 2, ",", ".") + " TL" + " )");
                    $(clone).find(".contentbox-body input[type='checkbox']").attr("id", "unLoadService").removeAttr("name").removeAttr("data-selector").addClass("disabled").attr("disabled", true);
                    $(clone).find(".contentbox-body #gift-note-area").remove();
                    if($("#step2Form #unLoadService").length > 0) $("#step2Form #unLoadService").parents("#checkout-unload-service").remove();
                    $("#checkout-cargo-details-content").before($(clone));
                    if ($("#step2Form #unLoadService")[0].checked) $("#step2Form #unLoadService")[0].checked = false;
                    if(app.selectedShippingAddress.İndirmeÜcreti === 0) $("#step2Form #unLoadService").parent().find("label").text("Araçtan Yem İndirme Hizmeti İstiyorum ( ÜCRETSİZ )");
                }else {
                    $("#step2Form #checkout-unload-service").remove();
                }
                let specialCargo = (app.selectedShippingAddress.ÖzelNakliye === 0) ? "ÜCRETSİZ" : app.selectedShippingAddress.ÖzelNakliye;
                $("#checkout-cargo-details-content #shippingCompanyId_" + app.cargoId2).parent().find("label .cargo-right .label-price strong").text((specialCargo === "ÜCRETSİZ") ? "ÜCRETSİZ" : app.eventListener.numberFormat(specialCargo, 2, ",", ".") + " TL");
                if($("#checkout-cargo-details-content #shippingCompanyId_" + app.cargoId2).length > 0 && $("#checkout-cargo-details-content #shippingCompanyId_" + app.cargoId2)[0].checked){
                    $("#cart-summary .cart-panel-amount-details .cart-panel-row:contains('Kargo')").find("span:eq(1)").text(app.eventListener.numberFormat(specialCargo, 2, ",", ".") + " TL");
                    let priceWithCargo = parseFloat($("#cart-summary .cart-panel-amount-details #cart-total-amount").text().replace(".", "").replace(",", ".").replace(" TL", ""));
                    priceWithCargo = priceWithCargo + specialCargo;
                    $("#cart-summary .cart-panel-amount-details #cart-total-amount").attr("data-final-amount", app.eventListener.numberFormat(priceWithCargo, 2, ",", ".") + " TL").text(app.eventListener.numberFormat(priceWithCargo, 2, ",", ".") + " TL");
                    $("#step2Form #unLoadService").removeClass("disabled").removeAttr("disabled");
                }
                if($("#shippingCompanyId_"+app.cargoId2)[0].checked === false) $("#checkout-unload-service").remove();
            },
            checkShipping: () => {
                $("#address-list [data-type='shipping-address-wrapper']").parents(".row:eq(0)").find(".alert").parent().remove();
                // if (app.totalWeight > app.maxWeight) return false;
                let clone = $("#address-list [data-type='shipping-address-wrapper']").parents(".row:eq(0)").find(".col-12").last().clone();
                if(app.selectedShippingAddress.Max !== -1 && app.selectedShippingAddress.Min !== -1){
                    if(app.totalWeight < app.selectedShippingAddress.Max && app.totalWeight > app.selectedShippingAddress.Min) app.submitButtonErrorCode = false;
                    else if(app.totalWeight < app.selectedShippingAddress.Min){
                        $("#address-list [data-type='shipping-address-wrapper']").parents(".row:eq(0)").find(".col-12").last().before($(clone));
                        $(clone).addClass("mb-3").html(`<div class="alert alert-warning" role="alert">
                            <p class="mb-0 text-center w-100">Toplam Sepet Ağırlığınız:<span class="font-weight-bold ml-1">${ app.totalWeight } Kg</span></p>
                            <p class="mb-0 text-center w-100">Seçtiğiniz adrese en az <span class="font-weight-bold">${ app.selectedShippingAddress.Min } Kg</span> gönderim yapılmaktadır.</p>
                        </div>`);
                        app.submitButtonErrorCode = "min";
                    }
                    else if(app.selectedShippingAddress.Max !== -1 && app.totalWeight > app.selectedShippingAddress.Max){
                        if($("#address-list [data-type='shipping-address-wrapper']").parents(".row:eq(0)").find(".alert").length === 0){
                            $("#address-list [data-type='shipping-address-wrapper']").parents(".row:eq(0)").find(".col-12").last().before($(clone));
                            $(clone).addClass("mb-3").html(`<div class="alert alert-warning" role="alert">
                                <p class="mb-0 text-center w-100">Toplam Sepet Ağırlığınız:<span class="font-weight-bold ml-1">${ app.totalWeight } Kg</span></p>
                                <p class="mb-0 text-center w-100">Seçtiğiniz adrese en fazla <span class="font-weight-bold">${ app.selectedShippingAddress.Max } Kg</span> gönderim yapılmaktadır.</p>
                            </div>`);
                        }
                        app.submitButtonErrorCode = "max";
                    }
                }else if(app.selectedShippingAddress.Max !== -1 && app.selectedShippingAddress.Min === -1){
                    if(app.totalWeight < app.selectedShippingAddress.Max && app.totalWeight > app.selectedShippingAddress.Min) app.submitButtonErrorCode = false;
                    else if(app.totalWeight > app.selectedShippingAddress.Max){
                        if($("#address-list [data-type='shipping-address-wrapper']").parents(".row:eq(0)").find(".alert").length === 0){
                            $("#address-list [data-type='shipping-address-wrapper']").parents(".row:eq(0)").find(".col-12").last().before($(clone));
                            $(clone).addClass("mb-3").html(`<div class="alert alert-warning" role="alert">
                                <p class="mb-0 text-center w-100">Toplam Sepet Ağırlığınız:<span class="font-weight-bold ml-1">${ app.totalWeight } Kg</span></p>
                                <p class="mb-0 text-center w-100">Seçtiğiniz adrese en fazla <span class="font-weight-bold">${ app.selectedShippingAddress.Max } Kg</span> gönderim yapılmaktadır.</p>
                            </div>`);
                        }
                        app.submitButtonErrorCode = "max";
                    }
                }else if(app.selectedShippingAddress.Max === -1 && app.selectedShippingAddress.Min !== -1){
                    if(app.totalWeight < app.selectedShippingAddress.Max && app.totalWeight > app.selectedShippingAddress.Min) app.submitButtonErrorCode = false;
                    else if(app.totalWeight < app.selectedShippingAddress.Min){
                        if($("#address-list [data-type='shipping-address-wrapper']").parents(".row:eq(0)").find(".alert").length === 0){
                            $("#address-list [data-type='shipping-address-wrapper']").parents(".row:eq(0)").find(".col-12").last().before($(clone));
                            $(clone).addClass("mb-3").html(`<div class="alert alert-warning" role="alert">
                                <p class="mb-0 text-center w-100">Toplam Sepet Ağırlığınız:<span class="font-weight-bold ml-1">${ app.totalWeight } Kg</span></p>
                                <p class="mb-0 text-center w-100">Seçtiğiniz adrese en az <span class="font-weight-bold">${ app.selectedShippingAddress.Min } Kg</span> gönderim yapılmaktadır.</p>
                            </div>`);
                        }
                        app.submitButtonErrorCode = "min";
                    }
                }
            },
            addDistrictField: function() {            
                let self = this;            
                self.wait = 1;
                let wx = setInterval(function() {
                    if($("[name=country] option:selected").text() != '') {
                        clearInterval(wx);
                        if($("[name=country] option:selected").text() == 'Ülke') {
                            $("[name=country]").val(1);
                            IdeaApp.order.step2.loadLocations($("[name=country]"));                        
                        }
                        let i = setInterval(function() {
                            if($("select#shippingLocation").length || $("select#billingLocation").length) {
                                clearInterval(i);                    
                                if($("#shippingCountry").length) {
                                    let district = $("#shippingCountry").closest(".col-12").clone();
                                    district.find("#shippingCountry").attr("id", "shippingDistrict").attr("name", "shippingDistrict");
                                    if($("select#shippingSubLocation").length == 0 || $("select#shippingSubLocation option:selected").text() == 'İlçe') {
                                        self.updateDistrictField(district, 0);
                                    }
                                    $("#shippingCountry").closest(".col-12").hide();
                                    district.find("label").text("Mahalle");
                                    district.find("select option").each(function() {
                                        $(this).remove();
                                    });    
                                    if(district.find("select option:contains('Seçiniz')").length == 0) {
                                        district.find("select").append('<option value="" disabled selected>Seçiniz</option>');
                                    }
                                    $("#shippingSubLocation").closest(".col-12").after(district); 
                                    if($("#shippingSubLocation").length && $("select#shippingSubLocation").length == 0) {
                                        $("#shippingLocation").val(1);     
                                        IdeaApp.order.step2.loadSubLocations($("#shippingLocation"));
                                    }            
                                    else if($("#shippingSubLocation").length) {
                                        self.getDistrictsForCounty(0);
                                    }   
                                }
                                setTimeout(function() {
                                    if($("#billingLocation").length) {
                                        let district = $("#billingCountry").closest(".col-12").clone();
                                        district.find("#billingCountry").attr("id", "billingDistrict").attr("name", "billingDistrict");
                                        if($("select#billingSubLocation").length == 0 || $("select#billingSubLocation option:selected").text() == 'İlçe') {
                                            self.updateDistrictField(district, 0);
                                        }
                                        $("#billingCountry").closest(".col-12").hide();
                                        district.find("label").text("Mahalle");
                                        district.find("select option").each(function() {
                                            $(this).remove();
                                        });    
                                        if(district.find("select option:contains('Seçiniz')").length == 0) {
                                            district.find("select").append('<option value="" disabled selected>Seçiniz</option>');
                                        }
                                        $("#billingSubLocation").closest(".col-12").after(district); 
                                        if($("#billingSubLocation").length && $("select#billingSubLocation").length == 0) {
                                            $("#billingLocation").val(1);     
                                            IdeaApp.order.step2.loadSubLocations($("#billingLocation"));
                                        }            
                                        else if($("#billingSubLocation").length) {
                                            self.getDistrictsForCounty(1);
                                        }                                    
                                    }
                                    self.wait = 0;
                                }, 750);
                            }
                        }, 1);
                    }
                }, 1);                                          
            },
            updateDistrictField: function(elem, value) {
                if(elem.find("#shippingDistrict").length) {
                    if(value == 0) {
                        elem.find("select").after('<input id="shippingDistrict" type="text" class="form-control" placeholder="Mahalle" name="shippingDistrict" value="">');
                        elem.find("select").remove();
                    }
                    else {
                        elem.find("input").after('<select name="shippingDistrict" id="shippingDistrict"></select>');
                        elem.find("input").remove();                
                    }
                }
                else {
                    if(value == 0) {    
                        elem.find("select").after('<input id="billingDistrict" type="text" class="form-control" placeholder="Mahalle" name="billingDistrict" value="">');
                        elem.find("select").remove();
                    }
                    else {
                        elem.find("input").after('<select name="billingDistrict" id="billingDistrict"></select>');
                        elem.find("input").remove();                
                    }
                }
            },
            getDistrictsForCounty: function(value) {
                if(value == 0) {
                    let self = this;
                    let selected_province = $("#shippingLocation").find("option:selected").text().trim();
                    let selected_county = $("#shippingSubLocation").find("option:selected").text().trim();
                    if($("#shippingDistrict").find("option:contains('Seçiniz')").length == 0) {
                        $("#shippingDistrict").append('<option value="" disabled selected>Seçiniz</option>');
                    }
                    for(let key in app.districts[selected_province][selected_county]) {
                        $("#shippingDistrict").append('<option value="' + app.districts[selected_province][selected_county][key].id + '">' + app.districts[selected_province][selected_county][key].district + '</option>');
                    }
                    if(self.selectedShippingDistrict != "" && $("#shippingDistrict option:contains('" + self.selectedShippingDistrict + "')").length) {
                        $("#shippingDistrict").val($("#shippingDistrict option:contains('" + self.selectedShippingDistrict + "')").val());
                    }
                    self.cleanAddressField();
                    // $("#shippingDistrict").trigger("change");
                }
                else if(value == 2) {
                    $("#district").find("option").each(function() {
                        if($(this).text() != 'Seçiniz') {
                            $(this).remove();
                        }
                    });
                    let self = this;
                    let selected_province = $("#location").find("option:selected").text().trim();
                    let selected_county = $("#town").find("option:selected").text().trim();
                    for(let key in app.districts[selected_province][selected_county]) {
                        $("#district").append('<option value="' + app.districts[selected_province][selected_county][key].id + '">' + app.districts[selected_province][selected_county][key].district + '</option>');
                    }
                    if(self.selectedShippingDistrict != "" && $("#district option:contains('" + self.selectedShippingDistrict + "')").length) {
                        $("#district").val($("#shippingDistrict option:contains('" + self.selectedShippingDistrict + "')").val());
                    }
                    self.cleanAddressField();
                    $("#district").removeAttr("disabled");
                    // $("#district").trigger("change");
                }
                else {
                    let self = this;
                    let selected_province = $("#billingLocation").find("option:selected").text().trim();
                    let selected_county = $("#billingSubLocation").find("option:selected").text().trim();                
                    for(let key in app.districts[selected_province][selected_county]) {
                        $("#billingDistrict").append('<option value="' + app.districts[selected_province][selected_county][key].id + '">' + app.districts[selected_province][selected_county][key].district + '</option>');
                    }
                    if(self.selectedBillingDistrict != "" && $("#billingDistrict option:contains('" + self.selectedBillingDistrict + "')").length) {
                        $("#billingDistrict").val($("#billingDistrict option:contains('" + self.selectedBillingDistrict + "')").val());
                    }
                    self.cleanAddressField();
                    // $("#billingDistrict").trigger("change");
                }
            },
            detectNewAddress: function() {
                let self = this;
                let ix = setInterval(function() {
                    if($("[data-selector=edit-address-form],[data-selector=add-address-form]").length && $("#district").length == 0) {
                        self.wait = 1;
                        if($("[name=country] option:selected").text() == 'Seçiniz') {
                            $("[name=country]").val(1);
                            IdeaApp.member.profile.changeCountry($("[name=country]"));
                        }
                        let i = setInterval(function() {
                            if(typeof $("select#location").attr("disabled") == 'undefined' && $("#district").length == 0) {
                                clearInterval(i);
                                let district = $("[name=country]").closest(".col-12").clone();
                                district.find("[name=country]").attr("id", "district").attr("name", "district").removeAttr("data-selector").attr("required", true).attr("data-msg-required", "Lütfen Mahalle seçiniz.");
                                district.find(".control-label").text("Mahalle");
                                if($("select#location option:selected").text() == 'Seçiniz') {
                                    district.find("select").attr("disabled", true);
                                }
                                $("[name=country]").closest(".col-12").hide();
                                district.find("option").each(function() {
                                    if($(this).text() != 'Seçiniz') {
                                        $(this).remove();
                                    }
                                });
                                $("#town").closest(".col-12").after(district); 
                                self.wait = 0;
                                if($("#town option:selected").text() != 'Seçiniz' && $("[name=address]").text().indexOf(' | ') > -1) {
                                    self.getDistrictsForCounty(2);
                                    let a = $("[name=address]").text().split(" | ");
                                    $("[name=address]").val(a[1]);
                                    $("#district").val($("#district option:contains('" + a[0] + "')").val());
                                }
                            }
                        });
                    }                
                }, 1);
            },
            detectAddressUpdate: function() {
                let self = this;
                setInterval(function() {
                    if(self.wait == 0) {
                        if($("#shippingCountry").length && $("#shippingDistrict").length == 0) {                   
                            self.addDistrictField();
                        }
                        if($("#billingCountry").length && $("#billingDistrict").length == 0) {                    
                            self.addDistrictField();
                        }
                    }
                }, 100)
            },
            cleanAddressField: function() {
                let self;
                if($("#address").length && $("#address").val().indexOf(' | ') > -1) {
                    let a = $("#address").val().split(" | ");                    
                    $("#address").val(a[1]);
                    if($("#shippingDistrict").length) {
                        $("#shippingDistrict").val($("#shippingDistrict option:contains('" + a[0] + "')").val());
                    }
                    else {
                        $("#billingDistrict").val($("#billingDistrict option:contains('" + a[0] + "')").val());
                    }
                }
                if($("#billingAddress").length && $("#billingAddress").val().indexOf(' | ') > -1) {
                    let a = $("#billingAddress").val().split(" | ");                    
                    $("#billingAddress").val(a[1]);
                    $("#billingDistrict").val($("#billingDistrict option:contains('" + a[0] + "')").val());
                }
            },
            enableCouponCode: async () => {
                IdeaApp.plugins.loadingBar.show();
                await IdeaApp.helpers.ajaxRequest({
                    url: '/hediye-ceki-kullan',
                    data: {
                        'code': app.couponCode,
                        'anticsrf': anticsrf
                    },
                    success: response => {
                        if (!response.success) {
                            IdeaApp.plugins.notification(response.errorMessage, 'warning');
                            IdeaApp.plugins.loadingBar.hide();
                            return;
                        }
                        if (response.data.message !== '') {
                            IdeaApp.plugins.notification(response.data.message, 'warning');
                        }
                    }
                });
            },
            disableCouponCode: async () => {
                IdeaApp.plugins.loadingBar.show();
                await IdeaApp.helpers.ajaxRequest({
                    url: '/hediye-ceki-kaldir',
                    data: {
                        'anticsrf': anticsrf
                    },
                    success: response => {
                        location.reload();
                    }
                });
            },
            saveToLocalStorage: (id, qty, weight) => {
                /*let response = JSON.parse(localStorage.getItem("weight"));
                if(response === null){
                    localStorage.setItem("weight", JSON.stringify([{id: id, qty: qty, weight: weight}]));
                }else{
                    let hasItem = false;
                    let counter = 0;
                    response.forEach(element => {
                        if(element.id === id){
                            hasItem = counter;
                            return false;
                        }
                        counter++;
                    });

                    if(hasItem === false){
                        response.push({id: id, qty: qty, weight: weight});
                    }else{
                        response[hasItem].qty += qty;
                    }

                    localStorage.setItem("weight", JSON.stringify(response));
                }*/
            },
            checkToLocalStorage: () => {
                /*let response = JSON.parse(localStorage.getItem("weight"));
                if(response === null || Object.keys(IdeaCart.items).length === 0){
                    return false;
                }
                IdeaCart.items.forEach(element => {
                    response.forEach(element2 => {
                        if(element.product.id === element2.id){
                            element2.qty = element.quantity;
                            localStorage.setItem("weight", JSON.stringify(response));
                        }
                    });
                });*/
            },
            deleteToLocalStorage: () => {
                /*let response = JSON.parse(localStorage.getItem("weight"));
                let hasItem = false;
                let counter = 0;
                response.forEach(element2 => {
                    hasItem = false;
                    IdeaCart.items.forEach(element => {
                        if(element.product.id === element2.id){
                            hasItem = true;
                        }
                    });
                    if(hasItem === false){
                        response.splice(counter, 1);
                        (response.length > 0) ? localStorage.setItem("weight", JSON.stringify(response)) : localStorage.removeItem("weight");
                    }
                    counter++;
                });*/
            },
            hideStandartCargoes: () => {
                for (const iterator of $("#checkout-cargo-details-content .contentbox-body .radio-custom")) {
                    if($(iterator).find("input").val() !== app.cargoId2 && $(iterator).find("input").val() !== app.cargoId) $(iterator).addClass("d-none");
                    if($(iterator).find("input").val() === app.cargoId2 && app.selectedShippingAddress.Teslimat === 0) $(iterator).addClass("d-none");
                }
            },
            checkCargo: (self) => {
                return new Promise(resolve => {
                    if($("#checkout-cargo-details-content #shippingCompanyId_" + app.cargoId2).length > 0 && $("#checkout-cargo-details-content #shippingCompanyId_" + app.cargoId2)[0].checked){
                        let quantity = parseFloat($("#checkout-cargo-details-content #shippingCompanyId_" + app.cargoId2).parent().find("label .cargo-right .label-price strong").text().replace(".", "").replace(",", ".").replace(" TL", ""));
                        if (!isNaN(quantity)) {
                            IdeaCart.addItem(self, { "productId": app.iCargoId, "quantity": quantity });
                            let counter = 0;
                            let interval = setInterval(() => {
                                IdeaCart.items.forEach(element => {
                                    if(element.product.id === app.iCargoId){
                                        clearInterval(interval);
                                        resolve(true);
                                        return false;
                                    }
                                });
                                counter += 1;
                                if(counter === 3){
                                    clearInterval(interval);
                                    app.eventListener.checkCargo(self);
                                }
                            }, 500);
                        }
                    }
                });
            },
            checkUnloadService: (self) => {
                return new Promise(resolve => {
                    let quantity = ($("#step2Form #unLoadService").length > 0) ? $("#step2Form #unLoadService").parent().find("label").text().split("(")[1].replace(")", "").trim() : false;
                    quantity = parseFloat(quantity.replace("+", "").replace(" TL", "").replace(".", "").replace(",", "."));
                    if(!isNaN(quantity)) {
                        IdeaCart.addItem(self, { "productId": app.iUnloadServiceId, "quantity": quantity });
                        let counter = 0;
                        let interval = setInterval(() => {
                            IdeaCart.items.forEach(element => {
                                if(element.product.id === app.iUnloadServiceId){
                                    clearInterval(interval);
                                    resolve(true);
                                    return false;
                                }
                            });
                            counter += 1;
                            if(counter === 3){
                                clearInterval(interval);
                                app.eventListener.checkUnloadService(self);
                            }
                        }, 500);
                    } else resolve(true);
                });
            },
            removeStep2Items: (self, controller) => {
                let counter = 0;
                let interval = setInterval(() => {
                    IdeaCart.items.forEach(element => {
                        if(element.product.id === app.iCargoId || element.product.id === app.iUnloadServiceId){
                            clearInterval(interval);
                            IdeaCart.deleteItem(self, element.id);
                            app.eventListener.removeStep2Items(self, 1);
                            return false;
                        }
                    });
                    counter += 1;
                    if(counter === 3){
                        clearInterval(interval);
                        if (controller === 1) location.reload();
                    }
                }, 500);
            },
            step3CartEdit: () => {
                let response = JSON.parse(localStorage.getItem("step2cart"));
                response.forEach(element => {
                    for (const iterator of $("#cart-summary .cart-panel-amount-details").find(".cart-panel-row")) {
                        if($(iterator).find("span:eq(0)").text().trim() === element.key){
                            $(iterator).find("span:eq(1)").text(element.value);
                            break;
                        }
                    }
                });
                let hasUnloadService = false;
                IdeaCart.items.forEach(element => {
                    if(element.product.id === app.iUnloadServiceId) hasUnloadService = element.quantity;
                });
                if (hasUnloadService !== false){
                    let clone = $("#cart-summary .cart-panel-amount-details .cart-panel-row:eq(0)").clone();
                    $(clone).find("span:eq(0)").text("Araçtan Yem İndirme Hizmeti");
                    $(clone).find("span:eq(1)").text(app.eventListener.numberFormat(hasUnloadService, 2, ",", ".") + " TL");
                    $("#cart-summary .cart-panel-amount-details").find(".cart-panel-row").last().before($(clone));
                }
                $("#cart-summary #cart-items .cart-item .cart-details-title a").each((i, e) => {
                    if ($(e).attr("href").indexOf("/kargo") > -1) $(e).parents(".cart-item").addClass("d-none");
                    if ($(e).attr("href").indexOf("/aractan-yem-indirme-hizmeti") > -1) $(e).parents(".cart-item").addClass("d-none");
                });
            },
            orderFinished: () => {
                if (window.location.href.indexOf("/orderFinished") === -1) return false;
                localStorage.removeItem("step2cart");
                localStorage.removeItem("weight");
            },
            detectTotalWeight: () => {
                let dataId, weight = 0, quantity = 0, list = new Object(), totalWeight = 0, target = $();
                $("#cart-items .cart-item").each((index, elem) => {
                    dataId = $(elem).find("[data-selector='delete-cart-item']").attr("data-id");
                    target = $(elem).find(".cart-item-detail .cart-item-name a").text().trim();
                    weight = parseInt(target.split(" ")[target.split(" ").length - 2]);
                    quantity = parseFloat($(elem).find("[data-selector='qty']").val());
                    list[dataId] = weight * quantity;
                });
                for (const key in list) {
                    totalWeight += list[key];
                }
                localStorage.setItem("weight", totalWeight);
            }
        }
    }

    $(document).ready((e) => {
        if (window.location.href.indexOf("/step3") === -1) app.eventListener.removeStep2Items($(e.currentTarget), 0);
        /*let response = JSON.parse(localStorage.getItem("weight"));
        if(response !== null){
            response.forEach(element => {
                app.totalWeight += element.qty * element.weight;
            });
            
        }*/
        if (window.location.href.indexOf("/sepet") > -1) app.eventListener.detectTotalWeight();
        app.eventListener.init();
        app.eventListener.loadDistricts();
        app.eventListener.orderFinished();
    });

    $(document).on("DOMNodeRemoved", ".loading-bar", (e) => {
        app.eventListener.init();
        /*app.eventListener.checkToLocalStorage();*/
        if (window.location.href.indexOf("/sepet") > -1) app.eventListener.detectTotalWeight();
    });

    $(document).on("click", "#cart-summary #submitButton", (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        if(app.submitButtonErrorCode === false){
            if(!$("#step2Form").valid()) return false;
            if($("#checkout-unload-service").length > 0 && $("#unLoadService")[0].checked !== false && $("#checkout-unload-service [for='unLoadService']").text().indexOf("ÜCRETSİZ") > -1){
                if ($("#gift-note-change")[0].checked === false) $("#gift-note-change")[0].checked = true;
                $("#step2Form #checkout-gift-note #giftNote").val("Araçtan Yem İndirme Hizmeti İstiyorum");
            }
            let step2Cart = async () => {
                return new Promise(resolve =>{
                    let cart = new Array();
                    let key = "";
                    let value = "";
                    for (const iterator of $("#cart-summary .cart-panel-amount-details").find(".cart-panel-row")) {
                        if($(iterator).hasClass("cart-summary-total-price") !== false) continue;
                        key = $(iterator).find("span:eq(0)").text().trim();
                        value = $(iterator).find("span:eq(1)").text().trim();
                        cart.push({ key: key, value: value });
                    }
                    localStorage.setItem("step2cart", JSON.stringify(cart));
                    resolve(true);
                });
            }
            if ($("#checkout-cargo-details-content #shippingCompanyId_" + app.cargoId).length > 0 && $("#checkout-cargo-details-content #shippingCompanyId_" + app.cargoId)[0].checked)
                app.eventListener.enableCouponCode().then(() => { step2Cart().then(() => { $("#step2Form").submit(); }); });
            else if ($("#checkout-cargo-details-content #shippingCompanyId_" + app.cargoId2).length > 0 && $("#checkout-cargo-details-content #shippingCompanyId_" + app.cargoId2)[0].checked)
                app.eventListener.checkCargo($(e.currentTarget)).then(res => {
                    if (res && $("#step2Form #unLoadService").length > 0 && $("#step2Form #unLoadService")[0].checked) app.eventListener.checkUnloadService($(e.currentTarget)).then(res2 => {
                        if (res2) step2Cart().then(() => { $("#step2Form").submit(); }); 
                    });
                    else step2Cart().then(() => { $("#step2Form").submit(); }); 
                });
            else step2Cart().then(() => { $("#step2Form").submit(); });
        }else{
            switch (app.submitButtonErrorCode) {
                case "min":
                    Swal.fire({ icon: "warning", title: "Bilgilendirme!", text: "Sepete eklediğiniz ürünlerin ağırlığı minimum tutarın altındadır.", confirmButtonText: "Tamam" });
                    break;
                case "max":
                    Swal.fire({ icon: "warning", title: "Bilgilendirme!", text: "Sepete eklediğiniz ürünlerin ağırlığı maksimum tutarın üstündedir.", confirmButtonText: "Tamam" });
                    break;
            }
        }
    });

    /*$(document).on("click", "#addToCart", (e) => {
        if(app.addToCartTrigger === false){
            app.addToCartTrigger = true;
            let qty = parseFloat($(e.currentTarget).parents(".product-cart-buttons").find("[data-selector='qty']").val());
            app.eventListener.saveToLocalStorage(parseInt($(e.currentTarget).attr("data-product-id")), qty, volumetricWeight);
            $(e.currentTarget).attr("data-selector", "add-to-cart").attr("data-quantity", $(e.currentTarget).parents(".product-cart-buttons").find("[data-selector='qty']").val()).trigger("click");
        }else{
            app.addToCartTrigger = false;
            $(e.currentTarget).removeAttr("data-selector");
        }
    });*/

    /*$(document).on("click", "#cart-items [data-selector='delete-cart-item'], .modal-dialog [data-selector='cart-item-delete']", (e) => {
        let ideaCartLen = IdeaCart.itemCount;
        let interval = setInterval(() => {
            if(ideaCartLen > IdeaCart.itemCount){
                clearInterval(interval);
                app.eventListener.deleteToLocalStorage();
            }
        }, 1);
    });*/

    $(document).on("change", "#shippingLocation", function() {
        $("#shippingDistrict option").each(function(index) {
            if(index != 0) {
                $(this).remove();
            }
            else {
                $(this).attr("disabled", false);
            }
        });
        app.eventListener.updateDistrictField($("select#shippingDistrict").closest(".col-12"),0);
        $("#shippingDistrict option:eq(0)").attr("disabled", true);
    });

    $(document).on("change", "#billingLocation", function() {
        $("#billingDistrict option").each(function(index) {
            $(this).remove();
        });
        app.eventListener.updateDistrictField($("select#billingDistrict").closest(".col-12"),0);
    });

    $(document).on("change", "#shippingSubLocation", function() {
        $("#shippingDistrict option").each(function(index) {
            if(index != 0) {
                $(this).remove();
            }
            else {
                $(this).attr("disabled", false);
            }
        });
        $("#shippingSubLocation option:eq(0)").attr("disabled", true);    
        app.eventListener.updateDistrictField($("input#shippingDistrict").closest(".col-12"),1);            
        app.eventListener.getDistrictsForCounty(0);
        $("#shippingDistrict option:eq(0)").attr("disabled", true);
        app.eventListener.init();
    });

    $(document).on("change", "#billingSubLocation", function() {
        $("#billingDistrict option").each(function(index) {
            $(this).remove();
        });   
        app.eventListener.updateDistrictField($("input#billingDistrict").closest(".col-12"),1);            
        app.eventListener.getDistrictsForCounty(1);
    });

    $(document).on("change", "#shippingDistrict", function() {
        if($("address").length == 0) {
            app.selectedShippingDistrict = $("#shippingDistrict option:selected").val();
        }
        app.eventListener.init();
    });

    $(document).on("change", "#billingDistrict", function() {
        if($("address").length == 0) {
            app.selectedBillingDistrict = $("#billingDistrict option:selected").val();
        }
    });

    $(document).off("click", '[data-selector="submit-edit-address-form"]');
    $(document).off("click", '[data-selector="submit-address-form"]')
    $(document).on("click", "[data-selector=submit-edit-address-form],[data-selector=submit-address-form]", function() {
        if($("#shippingDistrict option:selected").val() == "") {
            return false;
        }
        if($("#shippingDistrict").length) {
            let d = $("#shippingDistrict option:selected").text().trim();
            if($("#address").val().indexOf(d) == -1) {
                let a = $("#address").val().split(" | ");
                if(a.length > 1) {
                    a.shift();
                }
                $("#address").val(d + " | " + a.join(" - "));
            }
            app.selectedShippingDistrict = d;
            if($(this).attr("data-selector") == "submit-edit-address-form") {
                IdeaApp.order.step2.memberAddress.edit($(this));
            }
            else {
                IdeaApp.order.step2.memberAddress.add($(this));
            } 
        }
        else {
            let d = $("#billingDistrict option:selected").text().trim();
            if($("#address").val().indexOf(d) == -1) {
                let a = $("#address").val().split(" | ");
                if(a.length > 1) {
                    a.shift();
                }
                $("#address").val(d + " | " + a.join(" - "));
            }
            app.selectedBillingDistrict = d;
            if($(this).attr("data-selector") == "submit-edit-address-form") {
                IdeaApp.order.step2.memberAddress.edit($(this));
            }
            else {
                IdeaApp.order.step2.memberAddress.add($(this));
            } 
        }
    });

    if(window.location.href.indexOf("/sepet") > -1){
        $(document).on("click", function() {
            if($('[data-type="billing-address-wrapper"]').length) {
                setTimeout(function() {
                    $("#customer_name").text($('[data-type="billing-address-wrapper"]:eq(0) address:eq(0) > h4 > span').text().split(" (")[1].split(")")[0]);
                }, 250);
            }
        });          
        $(document).on("keyup", "#billingFirstname, #billingSurname", function() {
            if(app.customer_name == '' && $("#differentBillingAddress").is(":checked")) {
                $("#customer_name").text($("#billingFirstname").val() + " " + $("#billingSurname").val());
            }
        });  
        $(document).on("keyup", "#firstname, #surname", function() {
            if(app.customer_name == '' && !$("#differentBillingAddress").is(":checked")) {
                $("#customer_name").text($("#firstname").val() + " " + $("#surname").val());
            }
        });  
        $(document).on("change", "#differentBillingAddress", function() {
            if(app.customer_name == '') {
                $("#firstname,#billingFirstname").trigger("keyup");
            }
        });
    }

    if(window.location.href.indexOf('/hesabim/adres-defteri') > -1) {
        $(document).on("change", "#town,#location", function() {
            $("#location option:contains('Seçiniz')").attr("disabled", true);
            if($(this).attr("id") == 'town') {
                $("#town option:contains('Seçiniz')").attr("disabled", true);
            }
            $("#district option:contains('Seçiniz')").attr("disabled", false);
            app.eventListener.getDistrictsForCounty(2);
        });
        $(document).on("change", "#district", function() {
            $("#district option:contains('Seçiniz')").attr("disabled", true);
        });
        $(document).off('click','[data-selector="add-address-form-button"], [data-selector="edit-address-form-button"]');
        $(document).off('[data-selector="add-address-form-button"]').on('click', '[data-selector="add-address-form-button"]', function() {
            if($('[data-selector="add-address-form"]').valid()) {
                let d = $("#district option:selected").text().trim();
                if($("[name=address]").val().indexOf(d) == -1) {
                    let a = $("[name=address]").val().split(" | ");
                    if(a.length > 1) {
                        a.shift();
                    }
                    $("[name=address]").val(d + " | " + a.join(" - "));
                }
                IdeaApp.member.addressList.submitAddressForm($(this));
            }
        });               
        $(document).off('[data-selector="edit-address-form-button"]').on('click', '[data-selector="edit-address-form-button"]', function() {
            if($('[data-selector="edit-address-form"]').valid()) {
                let d = $("#district option:selected").text().trim();
                if($("[name=address]").val().indexOf(d) == -1) {
                    let a = $("[name=address]").val().split(" | ");
                    if(a.length > 1) {
                        a.shift();
                    }
                    $("[name=address]").val(d + " | " + a.join(" - "));
                }
                IdeaApp.member.addressList.submitAddressForm($(this));
            }
        });
    }   

})(jQuery);