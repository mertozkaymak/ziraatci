(function($){

    let app = {
        totalWeight: localStorage.getItem("weight") == null ? 0 : parseInt(localStorage.getItem("weight")),
        maxWeightForCargos: localStorage.getItem("weight") == null ? 500 : parseInt(localStorage.getItem("maxWeightForCargos")),
        additionalProducts:{
            cargo: 2249,
            unloadservice: 2248
        },
        deliveryTypes: {
            deliveryFromFactory: "13",
            specialDelivery: "14"
        },
        selectedShippingAddress: new Object(),
        injects:{
            districts: localStorage.getItem("districts") == null ? {} : JSON.parse(localStorage.getItem("districts")),
            serviceEndpoint: "***/request.php",
            couponCode: "Hw3h69",
            wait: 0,
            selectedShippingDistrict: "",
            selectedBillingDistrict: ""
        },
        alerts: {
            addressNotFound: function() {
                $("#step2Form #differentBillingAddress").parents(".col-12:eq(0)").before(`<div class="col-12 border mb-3 py-3 bg-info rounded" data-alert-name="addressNotFound">
                    <p class="d-flex align-items-center justify-content-center text-center text-white mb-0">
                        <i class="fas fa-exclamation-triangle mr-3"></i>
                        Seçilen adrese teslimat sağlanamamaktadır. Lütfen aderesinizi teslimat bölgesi içerisinde olacak şekilde güncelleyiniz.
                    </p>
                </div>`);
            },
            totalWeightUnderTheMin: function(){
                $("#step2Form #differentBillingAddress").parents(".col-12:eq(0)").before(`<div class="col-12 border mb-3 py-3 bg-info text-white rounded" data-alert-name="addressNotFound">
                    <p class="mb-0 text-center w-100">
                        Toplam Sepet Ağırlığınız:<span class="font-weight-bold mx-1">${ app.totalWeight } Kg</span>
                        Seçtiğiniz adrese en az <span class="font-weight-bold">${ app.selectedShippingAddress.Min } Kg</span> gönderim yapılmaktadır.
                    </p>
                </div>`);
            },
            totalWeightOverTheMax: function(){
                $("#step2Form #differentBillingAddress").parents(".col-12:eq(0)").before(`<div class="col-12 border mb-3 py-3 bg-info text-white rounded" data-alert-name="addressNotFound">
                    <p class="mb-0 text-center w-100">
                        Toplam Sepet Ağırlığınız:<span class="font-weight-bold mx-1">${ app.totalWeight } Kg</span>
                        Seçtiğiniz adrese en çok <span class="font-weight-bold">${ app.selectedShippingAddress.Max } Kg</span> gönderim yapılmaktadır.
                    </p>
                </div>`);
            },
            unloadServiceError: function(){
                return `<div class="col-12 m-0 p-0 py-3" data-info-name="unloadServiceError">
                    <h6 class="text-danger mb-0">
                        Seçilen adrese araçtan ürün indirme hizmeti <u class="ml-1">verilmemektedir</u>.
                    </h6>
                </div>`;
            }
        },
        eventlistener:{
            injects:{
                numberFormat: function(number, decimals, dec_point, thousands_sep) {
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
                enableCouponCode: async function() {
                    IdeaApp.plugins.loadingBar.show();
                    await IdeaApp.helpers.ajaxRequest({
                        url: '/hediye-ceki-kullan',
                        data: {
                            'code': app.injects.couponCode,
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
                disableCouponCode: async function() {
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
                loadDistricts: function() {
                    if(Object.keys(app.injects.districts).length == 0) {
                        $.post(app.injects.serviceEndpoint, { action: 1 }, response => {
                            localStorage.setItem("districts", response);
                            response = JSON.parse(response);
                            app.injects.districts = response;
                        });
                    }
                },
                addDistrictField: function() {
                    let self = this;            
                    app.injects.wait = 1;
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
                                        app.injects.wait = 0;
                                    }, 750);
                                }
                            }, 1);
                        }
                    }, 1);
                },
                detectAddressUpdate: function() {
                    let self = this;
                    setInterval(function() {
                        if(app.injects.wait == 0) {
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
                        for(let key in app.injects.districts[selected_province][selected_county]) {
                            $("#shippingDistrict").append('<option value="' + app.injects.districts[selected_province][selected_county][key].id + '">' + app.injects.districts[selected_province][selected_county][key].district + '</option>');
                        }
                        if(app.injects.selectedShippingDistrict != "" && $("#shippingDistrict option:contains('" + app.injects.selectedShippingDistrict + "')").length) {
                            $("#shippingDistrict").val($("#shippingDistrict option:contains('" + app.injects.selectedShippingDistrict + "')").val());
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
                        for(let key in app.injects.districts[selected_province][selected_county]) {
                            $("#district").append('<option value="' + app.injects.districts[selected_province][selected_county][key].id + '">' + app.injects.districts[selected_province][selected_county][key].district + '</option>');
                        }
                        if(app.injects.selectedShippingDistrict != "" && $("#district option:contains('" + app.injects.selectedShippingDistrict + "')").length) {
                            $("#district").val($("#shippingDistrict option:contains('" + app.injects.selectedShippingDistrict + "')").val());
                        }
                        self.cleanAddressField();
                        $("#district").removeAttr("disabled");
                        // $("#district").trigger("change");
                    }
                    else {
                        let self = this;
                        let selected_province = $("#billingLocation").find("option:selected").text().trim();
                        let selected_county = $("#billingSubLocation").find("option:selected").text().trim();                
                        for(let key in app.injects.districts[selected_province][selected_county]) {
                            $("#billingDistrict").append('<option value="' + app.injects.districts[selected_province][selected_county][key].id + '">' + app.injects.districts[selected_province][selected_county][key].district + '</option>');
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
            },
            init: function(){
                let self = this;
                if (window.location.href.indexOf("/sepet") > -1) self.detectTotalWeight();
                if (window.location.href.indexOf("/step3") === -1 && $(".cart-panel-row:contains('İndirim')").length) self.injects.disableCouponCode();
                if (window.location.href.indexOf('/step2') > -1) {
                    if (!$("#shippingDistrict").length) self.injects.addDistrictField();
                    self.injects.detectAddressUpdate();
                    self.injects.cleanAddressField();
                    self.loadExcel().then(function(){
                        self.hideStandartCargoes();
                        self.checkService();
                        $("#address-list [data-alert-name]").remove();
                        if ($("#checkout-cargo-details-content #shippingCompanyId_"+app.deliveryTypes.specialDelivery)[0].checked !== false) self.checkShipping();
                    });
                }
                if (window.location.href.indexOf('/hesabim/adres-defteri') > -1) self.injects.detectNewAddress();
                if (window.location.href.indexOf("/step3") > -1) self.step3CartEdit();
            },
            loadExcel: async function() {
                let checkSelectedShippingAddress = function() {
                    let err = false;
                    for (const key in app.selectedShippingAddress) {
                        if (typeof app.selectedShippingAddress[key] === "undefined" || app.selectedShippingAddress[key] === "" || app.selectedShippingAddress[key] === "Seçiniz" || app.selectedShippingAddress[key] === "Şehir" || app.selectedShippingAddress[key] === "İlçe"){
                           err = true;
                           break; 
                        }
                    }
                    return err;
                },
                setSelectedShippingAddress = function(response) {
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
                };
                class getSelectedShippingAddress {
                    constructor() {
                        if ($("#address-list").length) {
                            this.address = $("#address-list [data-type='shipping-address-wrapper'] .address-block-header address p").text();
                            if (this.address.indexOf("|") > -1) {
                                app.selectedShippingAddress.district = this.address.split("|")[0].trim();
                                app.selectedShippingAddress.county = this.address.split("|")[1].split("-")[1].trim();
                                app.selectedShippingAddress.province = this.address.split("|")[1].split("-")[2].trim();
                            }
                        } else {
                            app.selectedShippingAddress.district = $("#step2Form #shippingDistrict option:selected").text().trim();
                            app.selectedShippingAddress.county = $("#step2Form #shippingSubLocation option:selected").text().trim();
                            app.selectedShippingAddress.province = $("#step2Form #shippingLocation option:selected").text().trim();
                        }
                    }
                }

                new getSelectedShippingAddress();
                if(checkSelectedShippingAddress() !== false) return false;

                await $.post(app.injects.serviceEndpoint, { action: 2, selectedShippingAddress: JSON.stringify(app.selectedShippingAddress) }, response => {
                    response = JSON.parse(response);
                    if(response.length === 0){
                        app.alerts.addressNotFound();
                        return false;
                    }
                    setSelectedShippingAddress(response);
                });
            },
            checkService: function() {
                let specialDeliveryAsText = (app.selectedShippingAddress.ÖzelNakliye === 0) ? "ÜCRETSİZ" : app.eventlistener.injects.numberFormat(app.selectedShippingAddress.ÖzelNakliye, 2, ",", ".") + "TL",
                specialDeliveryEffected = function(){
                    let totalPriceObject = $("#cart-summary .cart-panel-amount-details #cart-total-amount");
                    let totalPriceWithSpecialDelivery = parseFloat(totalPriceObject.text().replace(".", "").replace(",", ".").replace(" TL", "")) + app.selectedShippingAddress.ÖzelNakliye;
                    totalPriceWithSpecialDelivery = app.eventlistener.injects.numberFormat(totalPriceWithSpecialDelivery, 2, ",", ".");
                    totalPriceObject.attr("data-final-amount", `${ totalPriceWithSpecialDelivery } TL`).text(`${ totalPriceWithSpecialDelivery } TL`);
                }
                $("#checkout-unload-service").remove();
                if (app.selectedShippingAddress.İndirmeHizmeti === 1 && app.selectedShippingAddress.Teslimat === 1) {
                    let unloadserviceprice = app.selectedShippingAddress.İndirmeÜcreti * (app.totalWeight / 1000)
                    if ($("#checkout-cargo-details-content #shippingCompanyId_"+app.deliveryTypes.specialDelivery)[0].checked){
                        $("#step2Form #checkout-cargo-details-content").after(`<div id="checkout-unload-service" class="cart-block">
                            <div class="contentbox-header">
                                <h4>
                                    ARAÇTAN ÜRÜN İNDİRME HİZMETİ
                                </h4>
                            </div>
                            <div class="contentbox-body">
                                <div class="form-group mb-0">
                                    <div class="checkbox-custom">
                                        <input type="checkbox" id="unLoadService">
                                        <label for="unLoadService">
                                            Araçtan Ürün İndirme Hizmeti İstiyorum ${ (unloadserviceprice === 0) ? " ( ÜCRETSİZ )" : " ( +" + app.eventlistener.injects.numberFormat(unloadserviceprice, 2, ",", ".") + " TL )" }
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>`);
                    }
                }else {
                    if ($("#checkout-cargo-details-content #shippingCompanyId_"+app.deliveryTypes.specialDelivery)[0].checked){
                        $("#step2Form #checkout-cargo-details-content").after(`<div id="checkout-unload-service" class="cart-block">
                            <div class="contentbox-header m-0 p-0">
                                <h4>
                                    ARAÇTAN ÜRÜN İNDİRME HİZMETİ
                                </h4>
                            </div>
                            <div class="contentbox-body">
                                ${ app.alerts.unloadServiceError() }
                            </div>
                        </div>`);
                    }
                }
                $("#checkout-cargo-details-content #shippingCompanyId_" + app.deliveryTypes.specialDelivery).parent().find("label .cargo-right .label-price strong").text(specialDeliveryAsText);
                if ($("#checkout-cargo-details-content #shippingCompanyId_" + app.deliveryTypes.specialDelivery)[0].checked === false) return false;
                $("#cart-summary .cart-panel-amount-details .cart-panel-row:contains('Kargo')").find("span:eq(1)").text((specialDeliveryAsText === "ÜCRETSİZ") ? "0,00 TL" : specialDeliveryAsText);
                specialDeliveryEffected();
            },
            checkShipping: function() {
                $("#address-list [data-alert-name]").remove();
                if (app.selectedShippingAddress.Max !== -1 && app.selectedShippingAddress.Min !== -1){
                    if (app.totalWeight < app.selectedShippingAddress.Min){
                        app.alerts.totalWeightUnderTheMin();
                    }else if (app.totalWeight > app.selectedShippingAddress.Max){
                        app.alerts.totalWeightOverTheMax();
                    }
                }else if (app.selectedShippingAddress.Max !== -1 && app.selectedShippingAddress.Min === -1){
                    if(app.totalWeight > app.selectedShippingAddress.Max){
                        app.alerts.totalWeightOverTheMax();
                    }
                }else if(app.selectedShippingAddress.Max === -1 && app.selectedShippingAddress.Min !== -1){
                    if (app.totalWeight < app.selectedShippingAddress.Min){
                        app.alerts.totalWeightUnderTheMin();
                    }
                }
                
            },
            detectTotalWeight: function() {
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
                $("head").append(`<!--digitalfikirler-->
                    <style>
                        .weigt-info{
                            color: #005aab;
                        }
                        @media (min-width: 375px) {
                            .weigt-info{
                                border: 0 !important;
                            }
                        }
                    </style>
                <!--digitalfikirler-->`);
                $("#cart-content .contentbox-header").addClass("d-flex justify-content-between align-items-center").append(`<div class="d-flex align-items-center text-center border-left weigt-info">
                    Toplam Sepet Ağırlığınız:
                    <h6 class="m-0 ml-2 font-weight-bold">${ totalWeight } Kg</h6>
                </div>`)
            },
            orderFinished: function() {
                if (window.location.href.indexOf("/orderFinished") === -1) return false;
                localStorage.removeItem("step2cart");
                localStorage.removeItem("weight");
            },
            hideStandartCargoes: function() {
                let deliveryTypes = $("#checkout-cargo-details-content .contentbox-body .radio-custom");
                if (app.totalWeight > app.maxWeightForCargos) {
                    if (app.selectedShippingAddress.Teslimat === 1) {
                        for (const iterator of deliveryTypes) {
                            if ($(iterator).find("input").val() !== app.deliveryTypes.deliveryFromFactory && $(iterator).find("input").val() !== app.deliveryTypes.specialDelivery){
                                $(iterator).addClass("d-none");
                            }
                        }
                    }else {
                        for (const iterator of deliveryTypes) {
                            if ($(iterator).find("input").val() === app.deliveryTypes.specialDelivery){
                                $(iterator).addClass("d-none");
                            }
                        }
                    }
                }else if (app.totalWeight <= app.maxWeightForCargos) {
                    for (const iterator of deliveryTypes) {
                        if ($(iterator).find("input").val() === app.deliveryTypes.specialDelivery) $(iterator).addClass("d-none");
                    }
                }
            },
            checkSpecialCargo: function(self) {
                return new Promise(resolve => {
                    let quantity = app.selectedShippingAddress.ÖzelNakliye;
                    if (!isNaN(quantity) && quantity !== 0) {
                        IdeaCart.addItem(self, { "productId": app.additionalProducts.cargo, "quantity": quantity });
                        let counter = 0;
                        let interval = setInterval(() => {
                            IdeaCart.items.forEach(element => {
                                if(element.product.id === app.additionalProducts.cargo){
                                    clearInterval(interval);
                                    resolve(true);
                                    return false;
                                }
                            });
                            counter += 1;
                            if(counter === 3){
                                clearInterval(interval);
                                app.eventlistener.checkSpecialCargo(self);
                            }
                        }, 500);
                    }else{
                        if ($("#gift-note-change")[0].checked === false) $("#gift-note-change")[0].checked = true;
                        $("#step2Form #checkout-gift-note #giftNote").val($("#step2Form #checkout-gift-note #giftNote").val()+" | Kargo: Özel Nakliye");
                        resolve(true);
                    }
                });
            },
            checkUnloadService: function(self) {
                return new Promise(resolve => {
                    let quantity = $("#step2Form #unLoadService").parent().find("label").text().split("(")[1].replace(")", "").trim();
                    quantity = parseFloat(quantity.replace("+", "").replace(" TL", "").replace(".", "").replace(",", "."));
                    if(!isNaN(quantity)) {
                        IdeaCart.addItem(self, { "productId": app.additionalProducts.unloadservice, "quantity": quantity });
                        let counter = 0;
                        let interval = setInterval(() => {
                            IdeaCart.items.forEach(element => {
                                if(element.product.id === app.additionalProducts.unloadservice){
                                    clearInterval(interval);
                                    resolve(true);
                                    return false;
                                }
                            });
                            counter += 1;
                            if(counter === 3){
                                clearInterval(interval);
                                app.eventlistener.checkUnloadService(self);
                            }
                        }, 500);
                    } else resolve(true);
                });
            },
            removeStep2Items: function(self, controller){
                let counter = 0;
                let interval = setInterval(() => {
                    IdeaCart.items.forEach(element => {
                        if(element.product.id === app.additionalProducts.cargo || element.product.id === app.additionalProducts.unloadservice){
                            clearInterval(interval);
                            IdeaCart.deleteItem(self, element.id);
                            app.eventlistener.removeStep2Items(self, 1);
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
            step3CartEdit: function() {
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
                    if(element.product.id === app.additionalProducts.unloadservice) hasUnloadService = element.quantity;
                });
                if (hasUnloadService !== false){
                    let clone = $("#cart-summary .cart-panel-amount-details .cart-panel-row:eq(0)").clone();
                    $(clone).find("span:eq(0)").text("Araçtan Yem İndirme Hizmeti");
                    $(clone).find("span:eq(1)").text(app.eventlistener.injects.numberFormat(hasUnloadService, 2, ",", ".") + " TL");
                    $("#cart-summary .cart-panel-amount-details").find(".cart-panel-row").last().before($(clone));
                }
                $("#cart-summary #cart-items .cart-item .cart-details-title a").each((i, e) => {
                    if ($(e).attr("href").indexOf("/kargo") > -1) $(e).parents(".cart-item").addClass("d-none");
                    if ($(e).attr("href").indexOf("/aractan-yem-indirme-hizmeti") > -1) $(e).parents(".cart-item").addClass("d-none");
                });
            },
            clearGiftNote: function(){
                let interval = setInterval(function(){
                    $("#step2Form #checkout-gift-note #giftNote").val("");
                    if($("#step2Form #checkout-gift-note #giftNote").val() === ""){
                        clearInterval(interval);
                        $("#gift-note-change")[0].checked = false;
                        $("#step2Form #checkout-gift-note #gift-note-area").attr("style", "display: none;");
                    }
                });
            }
        }
    }

    $(document).ready(function() {
        if (window.location.href.indexOf("/step3") < 0) app.eventlistener.removeStep2Items($(this), 0);
        if (window.location.href.indexOf("/step2") > -1) app.eventlistener.clearGiftNote();
        app.eventlistener.init();
        app.eventlistener.injects.loadDistricts();
        app.eventlistener.orderFinished();
    });
    
    $(document).on("DOMNodeRemoved", ".loading-bar", function() {
        app.eventlistener.init();
    });

    $(document).on("click", "#cart-summary #submitButton", function(e){
        e.preventDefault();
        e.stopImmediatePropagation();
        if ($("#address-list").length > 0 && $("#address-list [data-alert-name]").length > 0 && $("#checkout-cargo-details-content #shippingCompanyId_"+app.deliveryTypes.deliveryFromFactory)[0].checked === false) return false;
        let checkUnloadService = function() {
            let step2Cart = async function() {
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
            if (app.selectedShippingAddress.İndirmeÜcreti !== 0 && $("#unLoadService").length > 0 && $("#unLoadService")[0].checked !== false){
                if ($("#gift-note-change")[0].checked === false) $("#gift-note-change")[0].checked = true;
                $("#step2Form #checkout-gift-note #giftNote").val($("#step2Form #checkout-gift-note #giftNote").val()+"Araçtan Ürün İndirme Hizmeti İstiyorum.");
            }
            if ($("#checkout-cargo-details-content #shippingCompanyId_"+app.deliveryTypes.deliveryFromFactory)[0].checked !== false){
                app.eventlistener.injects.enableCouponCode().then(function(){
                    step2Cart().then(function(){
                        $("#step2Form").submit();
                    });
                });
            }else if ($("#checkout-cargo-details-content #shippingCompanyId_"+app.deliveryTypes.specialDelivery)[0].checked !== false){
                app.eventlistener.checkSpecialCargo($(e.currentTarget)).then(function(response){
                    if (response && $("#step2Form #unLoadService").length > 0 && $("#step2Form #unLoadService")[0].checked) app.eventlistener.checkUnloadService($(e.currentTarget)).then(function(response2){
                        if (response2) step2Cart().then(function(){ $("#step2Form").submit(); });
                    });
                    else step2Cart().then(function(){ $("#step2Form").submit(); });
                });
            }else step2Cart().then(() => { $("#step2Form").submit(); });
        };
        checkUnloadService();
    });

    $(document).on("change", "#shippingLocation", function() {
        $("#shippingDistrict option").each(function(index) {
            if(index != 0) {
                $(this).remove();
            }
            else {
                $(this).attr("disabled", false);
            }
        });
        app.eventlistener.injects.updateDistrictField($("select#shippingDistrict").closest(".col-12"),0);
        $("#shippingDistrict option:eq(0)").attr("disabled", true);
    });

    $(document).on("change", "#billingLocation", function() {
        $("#billingDistrict option").each(function(index) {
            $(this).remove();
        });
        app.eventlistener.injects.updateDistrictField($("select#billingDistrict").closest(".col-12"),0);
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
        app.eventlistener.injects.updateDistrictField($("input#shippingDistrict").closest(".col-12"),1);            
        app.eventlistener.injects.getDistrictsForCounty(0);
        $("#shippingDistrict option:eq(0)").attr("disabled", true);
        app.eventlistener.init();
    });

    $(document).on("change", "#billingSubLocation", function() {
        $("#billingDistrict option").each(function(index) {
            $(this).remove();
        });   
        app.eventlistener.injects.updateDistrictField($("input#billingDistrict").closest(".col-12"),1);            
        app.eventlistener.injects.getDistrictsForCounty(1);
    });

    $(document).on("change", "#shippingDistrict", function() {
        if($("address").length == 0) {
            app.injects.selectedShippingDistrict = $("#shippingDistrict option:selected").val();
        }
        app.eventlistener.init();
    });

    $(document).on("change", "#billingDistrict", function() {
        if($("address").length == 0) {
            app.injects.selectedBillingDistrict = $("#billingDistrict option:selected").val();
        }
    });

    $(document).off("click", '[data-selector="submit-edit-address-form"]');
    $(document).off("click", '[data-selector="submit-address-form"]')
    $(document).on("click", "[data-selector=submit-edit-address-form], [data-selector=submit-address-form]", function() {
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
            app.injects.selectedShippingDistrict = d;
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
            app.injects.selectedBillingDistrict = d;
            if($(this).attr("data-selector") == "submit-edit-address-form") {
                IdeaApp.order.step2.memberAddress.edit($(this));
            }
            else {
                IdeaApp.order.step2.memberAddress.add($(this));
            } 
        }
    });

    if(window.location.href.indexOf('/hesabim/adres-defteri') > -1) {

        $(document).on("change", "#town,#location", function() {
            $("#location option:contains('Seçiniz')").attr("disabled", true);
            if($(this).attr("id") == 'town') {
                $("#town option:contains('Seçiniz')").attr("disabled", true);
            }
            $("#district option:contains('Seçiniz')").attr("disabled", false);
            app.eventlistener.injects.getDistrictsForCounty(2);
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
