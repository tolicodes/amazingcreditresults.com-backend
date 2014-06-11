var request = require('request'),
  should = require('should'),
  testId = Math.floor(Math.random() * 10000),
  port = process.env.PORT || 3000,
  ownerHuntKey,
  sellerHuntKey,
  firstTradelineId,
  secondTradelineId;


describe('Owner creates new seller', function () {
  it('owners logins');

  it('owner creates seller');


  describe('seller do things', function () {
    it('seller logins');
    it('seller creates tradeline1');
    it('seller updates tradeline1');
    it('seller creates tradeline2');
    it('seller updates tradeline2');

    describe('owner do things', function () {
      it('approves tradeline1');
      it('and tradeline1 is correct');
      it('denies tradeline2');
      it('and tradeline2 is correct');
    });
  });
});


