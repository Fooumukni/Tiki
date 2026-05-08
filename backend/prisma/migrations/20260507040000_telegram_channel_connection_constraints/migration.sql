CREATE UNIQUE INDEX "ChannelConnection_secretCode_key" ON "ChannelConnection"("secretCode");

CREATE UNIQUE INDEX "ChannelConnection_channel_identifier_key" ON "ChannelConnection"("channel", "identifier");
