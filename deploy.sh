#!/usr/bin/env bash
set -x

mkdir -p _build/mockup

# Modify as need to deploy on different networks
TZC="tezos-client --mode client --protocol PtGRANADsDU8R9daYKAgWnQYAJ64omN1o3KMGVCykShA97vQbvV --endpoint https://granadanet.smartpy.io --base-dir _build/mockup"

#rm -rf _build/mockup
$TZC import secret key shubh unencrypted:edskRqFp3Z9AqoKrMNFb9bnWNwEsRzbjqjBhzmFMLF9UqB6VBmw7F8ppTiXaAnHtysmi6xFxoHf6rMUz6Y1ipiDz2EgwZQv3pa

deployment_key="shubh"
deployment_key_address=`$TZC show address ${deployment_key} | head -n 1 | awk '{print $2}'`

DEPLOYMENT_DATE=$(date '+%Y-%m-%d')

# Build and deploy ctez
ligo compile-contract ctez.mligo main > _build/ctez.tz
ligo compile-storage ctez.mligo main "$(sed s/DEPLOYMENT_DATE/${DEPLOYMENT_DATE}/ < ctez_initial_storage.mligo)" > _build/ctez_storage.tz
$TZC originate contract ctez transferring 0 from $deployment_key running 'file:_build/ctez.tz' --init "$(<_build/ctez_storage.tz)" --burn-cap 10
CTEZ_ADDRESS=`$TZC show known contract ctez`

# Build and deploy the fa12 for ctez
ligo compile-contract fa12.mligo main > _build/fa12.tz
ligo compile-storage fa12.mligo main "$(sed s/ADMIN_ADDRESS/$CTEZ_ADDRESS/ < fa12_ctez_initial_storage.mligo)" > _build/fa12_ctez_storage.tz
$TZC originate contract fa12_ctez transferring 0 from $deployment_key running 'file:_build/fa12.tz' --init "$(<_build/fa12_ctez_storage.tz)" --burn-cap 10
FA12_CTEZ_ADDRESS=`$TZC show known contract fa12_ctez`

# Build and deploy cfmm
ligo compile-contract cfmm_tez_ctez.mligo main > _build/cfmm.tz
sed s/FA12_CTEZ/${FA12_CTEZ_ADDRESS}/ < cfmm_initial_storage.mligo | sed s/CTEZ_ADDRESS/${CTEZ_ADDRESS}/ > _build/cfmm_storage.mligo

ligo compile-storage cfmm_tez_ctez.mligo main "$(<_build/cfmm_storage.mligo)" > _build/cfmm_storage.tz
$TZC originate contract cfmm transferring 0.000001 from $deployment_key running 'file:_build/cfmm.tz' --init "$(<_build/cfmm_storage.tz)" --burn-cap 10
CFMM_ADDRESS=`$TZC show known contract cfmm`

# Build and deploy the fa12 for the cfmm lqt, specifying the cfmm as admin
ligo compile-storage fa12.mligo main "$(sed s/ADMIN_ADDRESS/$CFMM_ADDRESS/ < fa12_ctez_initial_storage.mligo)" > _build/fa12_lqt_storage.tz
$TZC originate contract fa12_lqt transferring 0 from $deployment_key running 'file:_build/fa12.tz' --init "$(<_build/fa12_lqt_storage.tz)" --burn-cap 10
FA12_LQT_ADDRESS=`$TZC show known contract fa12_lqt`

# Set the lqt fa12 address in the cfmm
$TZC transfer 0 from $deployment_key to cfmm --entrypoint setLqtAddress --arg "\"$FA12_LQT_ADDRESS\"" --burn-cap 10

# Set the ctez fa12 address and the cfmm address in the oven management contract
$TZC transfer 0 from $deployment_key to ctez --entrypoint set_addresses --arg "Pair \"$CFMM_ADDRESS\" \"$FA12_CTEZ_ADDRESS\"" --burn-cap 10
